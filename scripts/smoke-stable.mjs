import { createRequire } from 'node:module'
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { spawn, execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const { _electron: electron } = require(process.env.DLME_PLAYWRIGHT_PATH || 'playwright')
const version = JSON.parse(await readFile(resolve('package.json'), 'utf8')).version
const root = resolve(`verification/${version}`), profile = join(root, `stable-${Date.now()}`), downloads = join(profile, 'Downloads')
await mkdir(downloads, { recursive: true })
function bencode(value) {
  if (typeof value === 'string') value = Buffer.from(value)
  if (Buffer.isBuffer(value)) return Buffer.concat([Buffer.from(`${value.length}:`), value])
  if (typeof value === 'number') return Buffer.from(`i${value}e`)
  if (Array.isArray(value)) return Buffer.concat([Buffer.from('l'), ...value.map(bencode), Buffer.from('e')])
  return Buffer.concat([Buffer.from('d'), ...Object.keys(value).sort().flatMap((key) => [bencode(key), bencode(value[key])]), Buffer.from('e')])
}
const payload = Buffer.alloc(8 * 1024 * 1024); for (let i = 0; i < payload.length; i++) payload[i] = i % 251
const files = [{ name: 'game-fixture.exe', data: payload }, { name: 'notes.txt', data: Buffer.from('A permitted test document.\n') }, { name: 'archive.zip', data: Buffer.from('Archive-shaped fixture, never executed or extracted.\n') }]
const peers = new Map()
const tracker = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost'), port = Number(url.searchParams.get('port')), peer = url.searchParams.get('peer_id')
  if (url.searchParams.get('event') === 'stopped') peers.delete(peer)
  else peers.set(peer, port)
  const others = [...peers].filter(([id]) => id !== peer).map(([, peerPort]) => { const entry = Buffer.from([127, 0, 0, 1, 0, 0]); entry.writeUInt16BE(peerPort, 4); return entry })
  response.end(bencode({ interval: 1, complete: 1, incomplete: 1, peers: Buffer.concat(others) }))
})
await new Promise((done) => tracker.listen(0, '127.0.0.1', done))
const trackerUrl = `http://127.0.0.1:${tracker.address().port}/announce`
const combined = Buffer.concat(files.map((file) => file.data)), pieceLength = 16384, pieces = []
for (let i = 0; i < combined.length; i += pieceLength) pieces.push(createHash('sha1').update(combined.subarray(i, i + pieceLength)).digest())
const info = { name: 'MixedFixture', 'piece length': pieceLength, pieces: Buffer.concat(pieces), files: files.map((file) => ({ length: file.data.length, path: [file.name] })) }
const torrentPath = join(profile, 'fixture.torrent'), infoHash = createHash('sha1').update(bencode(info)).digest('hex')
await writeFile(torrentPath, bencode({ announce: trackerUrl, info }))
const seedRoot = join(profile, 'seed'); await mkdir(join(seedRoot, 'MixedFixture'), { recursive: true })
for (const file of files) await writeFile(join(seedRoot, 'MixedFixture', file.name), file.data)
const seeder = spawn(resolve('resources/engine/aria2c.exe'), ['--no-conf', `--dir=${seedRoot}`, '--seed-time=10', '--seed-ratio=0', '--check-integrity=true', '--bt-hash-check-seed=true', '--enable-dht=false', '--enable-dht6=false', '--enable-peer-exchange=false', '--listen-port=16881', '--max-upload-limit=512K', '--console-log-level=warn', torrentPath], { windowsHide: true, stdio: 'pipe' })
let seedLog = ''; seeder.stdout.on('data', (chunk) => { seedLog += chunk }); seeder.stderr.on('data', (chunk) => { seedLog += chunk })
const magnet = `magnet:?xt=urn:btih:${infoHash}&dn=MixedFixture&tr=${encodeURIComponent(trackerUrl)}`
const errors = [], report = { version, profile, checks: [] }
let app
async function poll(page, predicate, arg, timeout = 90000) { const deadline = Date.now() + timeout; while (Date.now() < deadline) { const value = await page.evaluate(predicate, arg); if (value) return value; await new Promise((done) => setTimeout(done, 250)) } throw new Error(`Timed out: ${predicate.toString()}\nSeeder: ${seedLog}`) }
try {
  const env = { ...process.env, DLME_TEST_DATA: profile }; delete env.ELECTRON_RUN_AS_NODE
  const executable = process.env.DLME_TEST_EXE || resolve('node_modules/electron/dist/electron.exe')
  app = await electron.launch({ executablePath: executable, args: process.env.DLME_TEST_EXE ? [] : ['.'], cwd: process.cwd(), env, timeout: 60000 })
  let page = await app.firstWindow(); page.on('pageerror', (error) => errors.push(error.message)); await page.waitForFunction(() => !!window.dime)
  await page.evaluate(async (folder) => { await window.dime.updateSettings({ outputDirectory: folder, tutorialCompleted: true, engineAutoCheck: false, completionSound: false, completionNotifications: false }) }, downloads)
  await page.reload(); await page.getByRole('heading', { name: 'Download media', exact: true }).waitFor()
  assert.match(await page.locator('.version').innerText(), new RegExp(`${version.replaceAll('.', '\\.') }.*Stable`))
  await page.getByRole('button', { name: 'Torrents', exact: true }).click()
  await page.getByRole('textbox', { name: 'Magnet link', exact: true }).fill(magnet)
  await page.getByRole('button', { name: 'Add magnet', exact: true }).click()
  await page.getByRole('button', { name: 'Download', exact: true }).waitFor()
  await page.waitForFunction(() => !document.querySelector('[role=dialog] .primary')?.disabled, null, { timeout: 90000 })
  assert.equal(await page.locator('.torrent-file-list input').count(), 3)
  report.checks.push('magnet metadata and mixed-category file list')
  console.log('Magnet metadata resolved')
  await page.screenshot({ path: join(root, 'torrent-add.png') })
  // Select executable and document, leaving archive unselected.
  await page.locator('.torrent-file-list label').filter({ hasText: 'archive.zip' }).locator('input').uncheck()
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  let job = await poll(page, async () => (await window.dime.getHistory()).find((job) => job.options.torrent && job.state === 'downloading'))
  await poll(page, async (id) => { const job = (await window.dime.getHistory()).find((job) => job.id === id); return job?.progress.downloadedBytes > 0 && job.progress.percent > 0 }, job.id)
  report.checks.push('live torrent progress')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  job = await poll(page, async (id) => (await window.dime.getHistory()).find((job) => job.id === id && job.state === 'paused'), job.id)
  const pausedBytes = job.progress.downloadedBytes
  await new Promise((done) => setTimeout(done, 1800))
  assert.equal((await page.evaluate(() => window.dime.getHistory()))[0].progress.downloadedBytes, pausedBytes)
  report.checks.push('pause confirmed and stable counters')
  await app.close()
  app = await electron.launch({ executablePath: executable, args: process.env.DLME_TEST_EXE ? [] : ['.'], cwd: process.cwd(), env, timeout: 60000 })
  page = await app.firstWindow(); await page.waitForLoadState('load'); await page.waitForFunction(() => !!window.dime)
  await page.getByRole('button', { name: 'Torrents', exact: true }).click()
  assert.equal((await page.evaluate(() => window.dime.getHistory())).find((item) => item.id === job.id).state, 'paused')
  report.checks.push('paused torrent survives application restart')
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  job = await poll(page, async (id) => (await window.dime.getHistory()).find((job) => job.id === id && ['completed', 'blocked'].includes(job.state)), job.id)
  assert.equal(job.state, 'completed', JSON.stringify(job))
  for (const file of files.slice(0, 2)) assert.deepEqual(await readFile(join(job.options.outputDirectory, 'MixedFixture', file.name)), file.data)
  report.checks.push('selected-file download integrity and completion')
  console.log('Torrent selected files verified')
  // Cancelling must never remove payload bytes or resume data, even when media partial cleanup is disabled.
  const cancelRoot = join(profile, 'cancel-preservation')
  await page.evaluate(() => window.dime.updateSettings({ keepPartialFiles: false }))
  const cancelJob = await page.evaluate(async ({ torrentPath, cancelRoot }) => {
    const input = await window.dime.addTorrentInput(torrentPath)
    const ready = input.status === 'ready' ? input : await window.dime.resolveTorrent(input.id)
    return window.dime.enqueueTorrent({ id: ready.id, files: [ready.details.files[0].index], destination: cancelRoot })
  }, { torrentPath, cancelRoot })
  await poll(page, async (id) => { const item = (await window.dime.getHistory()).find((entry) => entry.id === id); return item?.progress.downloadedBytes > 0 }, cancelJob.id)
  await page.evaluate((id) => window.dime.cancelJob(id), cancelJob.id)
  await poll(page, async (id) => (await window.dime.getHistory()).find((entry) => entry.id === id && entry.state === 'cancelled'), cancelJob.id)
  assert.ok((await stat(join(cancelRoot, 'MixedFixture', files[0].name))).size > 0)
  report.checks.push('torrent cancellation preserves downloaded payload bytes when partial cleanup is disabled')
  if (await page.getByRole('button', { name: 'Close Add Torrent', exact: true }).count()) await page.getByRole('button', { name: 'Close Add Torrent', exact: true }).click()
  await page.getByRole('button', { name: 'Files & peers', exact: true }).first().click()
  await page.screenshot({ path: join(root, 'torrent-completed.png') })
  // Cold and warm external magnet handoff, using a no-peer hash for cancellation.
  const waitingMagnet = `magnet:?xt=urn:btih:${'b'.repeat(40)}&dn=WaitingFixture`
  const second = spawn(executable, [...(process.env.DLME_TEST_EXE ? [] : ['.']), waitingMagnet], { cwd: process.cwd(), env, windowsHide: true, stdio: 'ignore' })
  await page.getByRole('dialog', { name: 'Add Torrent' }).waitFor({ timeout: 30000 })
  await page.getByRole('button', { name: 'Close Add Torrent', exact: true }).click()
  report.checks.push('second-instance magnet handoff and cancelled lookup')
  await new Promise((done) => { if (second.exitCode !== null) return done(); second.once('exit', done); setTimeout(done, 5000) })
  await page.getByRole('button', { name: 'Downloader', exact: true }).click()
  await page.getByRole('button', { name: 'Unmute app sounds', exact: true }).click()
  assert.equal((await page.evaluate(() => window.dime.getSettings())).completionSound, true)
  await page.getByRole('button', { name: 'Mute app sounds', exact: true }).click()
  assert.equal((await page.evaluate(() => window.dime.getSettings())).completionSound, false)
  await page.getByRole('button', { name: 'Expand', exact: true }).click()
  await page.screenshot({ path: join(root, 'terminal-expanded.png') })
  await page.getByRole('button', { name: 'Restore', exact: true }).click()
  for (const theme of ['oled', 'charcoal', 'light']) {
    await page.evaluate((theme) => window.dime.updateSettings({ theme }), theme); await page.reload()
    await page.getByRole('button', { name: 'Torrents', exact: true }).click()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(900, 650))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(root, `torrents-minimum-${theme}.png`) })
  }
  report.checks.push('mute persistence, expanded terminal, minimum window and all themes')
  assert.deepEqual(errors, [])
  await app.close()
  app = await electron.launch({ executablePath: executable, args: [...(process.env.DLME_TEST_EXE ? [] : ['.']), waitingMagnet], cwd: process.cwd(), env, timeout: 60000 })
  page = await app.firstWindow(); await page.waitForLoadState('load')
  await page.getByRole('dialog', { name: 'Add Torrent' }).waitFor({ timeout: 30000 })
  await page.getByRole('button', { name: 'Close Add Torrent', exact: true }).click()
  report.checks.push('cold-start magnet handoff')
  report.status = 'passed'
} catch (error) { report.status = 'failed'; report.error = error.stack; throw error }
finally { if (app) await app.close(); seeder.kill(); tracker.close(); await writeFile(join(root, 'stable-smoke.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)) }
