import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { resolve, join, basename } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const { _electron: electron } = require(process.env.DLME_PLAYWRIGHT_PATH || 'playwright')
const root = resolve('verification/1.0.0'), profile = join(root, `media-controls-${Date.now()}`), downloads = join(profile, 'Downloads'), fixture = join(profile, 'dash')
await mkdir(fixture, { recursive: true }); await mkdir(downloads, { recursive: true })
const ffmpeg = resolve('resources/engine/ffmpeg.exe'), ffprobe = resolve('resources/engine/ffprobe.exe')
execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '8', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-f', 'dash', join(fixture, 'manifest.mpd')], { windowsHide: true, cwd: fixture })
execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '15', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-y', join(profile, 'slow.mp4')], { windowsHide: true })
const slow = await readFile(join(profile, 'slow.mp4'))
let slowConnections = 0
const server = createServer(async (request, response) => {
  const name = basename(new URL(request.url, 'http://localhost').pathname)
  try {
    if (name.startsWith('slow')) {
      const start = Number(request.headers.range?.match(/bytes=(\d+)-/)?.[1] || 0)
      response.writeHead(start ? 206 : 200, { 'Content-Type': 'video/mp4', 'Content-Length': slow.length - start, 'Accept-Ranges': 'bytes', ...(start ? { 'Content-Range': `bytes ${start}-${slow.length - 1}/${slow.length}` } : {}) })
      if (request.method === 'HEAD') return response.end()
      slowConnections++; let offset = start
      const timer = setInterval(() => { if (offset >= slow.length) { clearInterval(timer); response.end(); return } response.write(slow.subarray(offset, offset + 16384)); offset += 16384 }, 80)
      response.once('close', () => { clearInterval(timer); slowConnections-- }); return
    }
    const body = await readFile(join(fixture, name))
    response.writeHead(200, { 'Content-Type': name.endsWith('.mpd') ? 'application/dash+xml' : 'video/mp4', 'Content-Length': body.length })
    response.end(request.method === 'HEAD' ? undefined : body)
  } catch { response.writeHead(404); response.end() }
})
await new Promise((done) => server.listen(0, '127.0.0.1', done))
const baseUrl = `http://127.0.0.1:${server.address().port}`
const report = { version: '1.0.0', checks: [], outputs: [] }
let app
async function poll(page, predicate, arg, timeout = 120000) { const deadline = Date.now() + timeout; while (Date.now() < deadline) { const value = await page.evaluate(predicate, arg); if (value) return value; await new Promise((done) => setTimeout(done, 200)) } throw new Error(`Timed out: ${predicate.toString()}`) }
function probe(path) { return JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], { encoding: 'utf8', windowsHide: true })) }
try {
  const env = { ...process.env, DLME_TEST_DATA: profile }; delete env.ELECTRON_RUN_AS_NODE
  app = await electron.launch({ executablePath: process.env.DLME_TEST_EXE || resolve('node_modules/electron/dist/electron.exe'), args: process.env.DLME_TEST_EXE ? [] : ['.'], cwd: process.cwd(), env })
  console.log('Media smoke app launched')
  const page = await app.firstWindow(); await page.waitForLoadState('load'); await page.waitForFunction(() => !!window.dime); await page.getByRole('heading', { name: 'Download media', exact: true }).waitFor({ timeout: 15000 })
  await page.evaluate(async (folder) => window.dime.updateSettings({ outputDirectory: folder, tutorialCompleted: true, engineAutoCheck: false, completionNotifications: false, completionSound: false, maxConcurrent: 1 }), downloads)
  console.log('Media settings configured')
  await page.reload({ timeout: 15000 }); await page.getByRole('heading', { name: 'Download media', exact: true }).waitFor()
  // Actual separate DASH video and audio tracks exercise automatic pairing.
  console.log('Analyzing split-track fixture')
  const analysis = await page.evaluate((url) => window.dime.analyzeUrl({ url }), `${baseUrl}/manifest.mpd`)
  assert.ok(analysis.formats.some((format) => format.audioCodec === 'none'))
  assert.ok(analysis.formats.some((format) => format.videoCodec === 'none'))
  for (const container of ['mp4', 'mkv', 'webm']) {
    const id = await page.evaluate(async ({ analysis, downloads, container }) => {
      const video = analysis.formats.find((format) => format.audioCodec === 'none')
      const [job] = await window.dime.enqueueDownload({ analysis, selectedEntryIds: [analysis.id], options: { kind: 'video', quality: '1080', videoContainer: container, audioContainer: 'best', audioQuality: 'best', outputDirectory: downloads, ...(container === 'mp4' ? { exactFormatId: video.id } : {}) } }); return job.id
    }, { analysis, downloads, container })
    const job = await poll(page, async (id) => (await window.dime.getHistory()).find((job) => job.id === id && ['completed', 'blocked'].includes(job.state)), id)
    assert.equal(job.state, 'completed', JSON.stringify(job)); const metadata = probe(job.outputPath)
    assert.ok(metadata.streams.some((stream) => stream.codec_type === 'video')); assert.ok(metadata.streams.some((stream) => stream.codec_type === 'audio'))
    assert.equal(job.outputPath.split('.').pop(), container)
    report.outputs.push({ kind: 'video', container, codecs: metadata.streams.map((stream) => stream.codec_name) })
    console.log(`Verified ${container} with audio`)
  }
  for (const container of ['best', 'mp3', 'm4a', 'opus', 'wav']) {
    const folder = join(downloads, container)
    const id = await page.evaluate(async ({ analysis, folder, container }) => { const [job] = await window.dime.enqueueDownload({ analysis, selectedEntryIds: [analysis.id], options: { kind: 'audio', quality: 'best', videoContainer: 'mp4', audioContainer: container, audioQuality: 'best', outputDirectory: folder } }); return job.id }, { analysis, folder, container })
    const job = await poll(page, async (id) => (await window.dime.getHistory()).find((job) => job.id === id && ['completed', 'blocked'].includes(job.state)), id)
    assert.equal(job.state, 'completed', JSON.stringify(job)); const metadata = probe(job.outputPath)
    assert.ok(metadata.streams.some((stream) => stream.codec_type === 'audio')); assert.ok(!metadata.streams.some((stream) => stream.codec_type === 'video'))
    report.outputs.push({ kind: 'audio', container, codecs: metadata.streams.map((stream) => stream.codec_name) }); console.log(`Verified ${container} audio`)
  }
  report.checks.push('separate video/audio DASH tracks; exact video-only pairing; MP4/MKV/WebM; Best/MP3/M4A/Opus/WAV')
  await page.getByRole('textbox', { name: 'Media URL' }).fill(`${baseUrl}/slow.mp4`)
  await page.getByRole('button', { name: 'Analyze URL', exact: true }).click(); await page.getByRole('button', { name: 'Start 1 download', exact: true }).click()
  let job = await poll(page, async () => (await window.dime.getHistory()).find((job) => job.state === 'downloading' && job.progress.percent > 0))
  await page.screenshot({ path: join(root, 'media-progress.png') })
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  job = await poll(page, async (id) => (await window.dime.getHistory()).find((job) => job.id === id && job.state === 'paused'), job.id)
  await new Promise((done) => setTimeout(done, 1200)); assert.equal(slowConnections, 0)
  report.checks.push('media Pause terminated the actual transfer')
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await poll(page, async (id) => (await window.dime.getHistory()).find((job) => job.id === id && job.state === 'downloading'), job.id)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  job = await poll(page, async (id) => (await window.dime.getHistory()).find((job) => job.id === id && job.state === 'cancelled'), job.id)
  await new Promise((done) => setTimeout(done, 1800)); assert.equal(slowConnections, 0)
  assert.equal((await page.evaluate(() => window.dime.getHistory())).find((item) => item.id === job.id).state, 'cancelled')
  report.checks.push('media Resume and Cancel; no transfer or automatic restart after stopping')
  report.status = 'passed'
} catch (error) { report.status = 'failed'; report.error = error.stack; throw error }
finally { if (app) { const child = app.process(); let timer; await Promise.race([app.close(), new Promise((done) => { timer = setTimeout(() => { child.kill(); done() }, 5000) })]); clearTimeout(timer) } server.close(); await writeFile(join(root, 'media-controls-smoke.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)) }
