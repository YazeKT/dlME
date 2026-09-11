import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const { _electron } = require(process.env.DLME_PLAYWRIGHT_PATH || 'playwright')
const release = JSON.parse(await readFile(resolve('package.json'), 'utf8')).version
const root = resolve(`verification/${release}`)
const profile = join(root, `public-profile-${Date.now()}`)
const downloads = join(profile, 'Downloads'); await mkdir(downloads, { recursive: true })
const env = { ...process.env, DLME_TEST_DATA: profile }; delete env.ELECTRON_RUN_AS_NODE
const app = await _electron.launch({ executablePath: process.env.DLME_TEST_EXE || resolve(`release/${release}/win-unpacked/dlME.exe`), args: [], env, timeout: 60000 })
try {
  const page = await app.firstWindow(); await page.waitForLoadState('load')
  await page.evaluate(async (folder) => { await window.dime.updateSettings({ outputDirectory: folder, tutorialCompleted: true, engineAutoCheck: false, completionSound: false, completionNotifications: false }) }, downloads)
  await page.reload(); await page.getByRole('heading', { name: 'Download media', exact: true }).waitFor()
  await page.getByRole('textbox', { name: 'Media URL' }).fill('https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/big_buck_bunny.mp4')
  await page.getByRole('button', { name: 'Analyze URL', exact: true }).click()
  await page.getByRole('button', { name: 'Start 1 download', exact: true }).waitFor({ timeout: 60000 })
  await page.getByRole('button', { name: 'Start 1 download', exact: true }).click()
  let job
  for (let i = 0; i < 240; i++) {
    job = (await page.evaluate(() => window.dime.getHistory()))[0]
    if (['completed', 'blocked'].includes(job?.state)) break
    await new Promise((done) => setTimeout(done, 500))
  }
  assert.equal(job?.state, 'completed', JSON.stringify(job))
  assert.match(job.outputPath, /Video[\\/].*\.mp4$/)
  assert.ok(job.size > 1_000_000)
  await page.screenshot({ path: join(root, 'public-download.png') })
  await writeFile(join(root, 'public-download-results.json'), JSON.stringify({ passed: true, source: job.sourceUrl, output: job.outputPath, bytes: job.size, state: job.state }, null, 2))
  console.log(JSON.stringify({ publicDownload: 'passed', bytes: job.size, output: job.outputPath }))
} finally { await app.close() }
