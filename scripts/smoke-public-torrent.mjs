import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const { _electron } = require(process.env.DLME_PLAYWRIGHT_PATH || 'playwright')
const root = resolve('verification/1.0.0'), profile = join(root, `public-torrent-${Date.now()}`)
await mkdir(profile, { recursive: true })
const env = { ...process.env, DLME_TEST_DATA: profile }; delete env.ELECTRON_RUN_AS_NODE
const app = await _electron.launch({ executablePath: resolve('release/1.0.0/win-unpacked/dlME.exe'), args: [], env })
const report = { source: 'https://webtorrent.io/torrents/sintel.torrent', checks: [] }
try {
  const page = await app.firstWindow(); await page.waitForLoadState('load')
  const input = await page.evaluate((path) => window.dime.addTorrentInput(path), resolve('verification/1.0.0/sintel.torrent'))
  assert.equal(input.status, 'ready')
  const file = input.details.files.find((file) => /\.srt$/i.test(file.path))
  assert.ok(file, 'Sintel fixture should contain a small subtitle file')
  await page.evaluate(() => window.dime.updateSettings({ completionNotifications: false, completionSound: false, engineAutoCheck: false }))
  const queued = await page.evaluate((request) => window.dime.enqueueTorrent(request), { id: input.id, files: [file.index], destination: join(profile, 'Downloads') })
  report.checks.push('public torrent metadata and selected subtitle file')
  let job
  for (let i = 0; i < 360; i++) {
    job = (await page.evaluate(() => window.dime.getHistory())).find((job) => job.id === queued.id)
    if (['completed', 'blocked'].includes(job.state)) break
    await new Promise((done) => setTimeout(done, 500))
  }
  report.state = job.state; report.progress = job.progress
  if (job.state === 'completed') {
    const data = await readFile(join(job.options.outputDirectory, file.path)); assert.equal(data.length, file.length); assert.ok(data.toString().includes('-->'))
    report.checks.push('selected subtitle transfer, piece verification, and subtitle content'); report.status = 'passed'
  } else { await page.evaluate((id) => window.dime.cancelJob(id), job.id); report.status = 'unavailable'; report.reason = job.errorMessage || 'Public swarm did not finish within three minutes.' }
} finally { await app.close(); await writeFile(join(root, 'public-torrent-smoke.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)) }
