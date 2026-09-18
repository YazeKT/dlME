import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const { _electron: electron } = require(process.env.DLME_PLAYWRIGHT_PATH || 'playwright')
const root = resolve('verification/1.0.0')
const profile = join(root, `installed-handoff-${Date.now()}`)
await mkdir(profile, { recursive: true })
const env = { ...process.env, DLME_TEST_DATA: profile }; delete env.ELECTRON_RUN_AS_NODE
// Windows file ShellExecute inherits Explorer's environment, so use the real
// installed profile when verifying both associations in one existing instance.
delete env.DLME_TEST_DATA
const executablePath = process.env.DLME_TEST_EXE
assert.ok(executablePath, 'Set DLME_TEST_EXE to the installed executable')
let app
try {
  app = await electron.launch({ executablePath, env, timeout: 60000 })
  const page = await app.firstWindow()
  await page.waitForFunction(() => !!window.dime)
  const skip = page.getByRole('button', { name: /Skip/ })
  if (await skip.count()) await skip.first().click()
  const association = await app.evaluate(({ app }) => ({ registered: app.setAsDefaultProtocolClient('magnet'), current: app.isDefaultProtocolClient('magnet') }))
  assert.equal(association.registered, true)
  assert.equal(association.current, true)
  await app.evaluate(({ shell }) => shell.openExternal('magnet:?xt=urn:btih:0123456789012345678901234567890123456789&dn=WindowsHandoff'))
  await page.getByRole('dialog', { name: 'Add Torrent' }).waitFor({ timeout: 30000 })
  await page.getByRole('button', { name: 'Close Add Torrent', exact: true }).click()
  const torrent = join(profile, 'handoff.torrent')
  const info = Buffer.concat([Buffer.from('d6:lengthi1e4:name11:fixture.txt12:piece lengthi16384e6:pieces20:'), Buffer.alloc(20), Buffer.from('e')])
  await writeFile(torrent, Buffer.concat([Buffer.from('d4:info'), info, Buffer.from('e')]))
  assert.equal(await app.evaluate(({ shell }, path) => shell.openPath(path), torrent), '')
  await page.getByRole('dialog', { name: 'Add Torrent' }).waitFor({ timeout: 30000 })
  await page.screenshot({ path: join(root, 'installed-torrent-handoff.png') })
  await page.getByRole('button', { name: 'Close Add Torrent', exact: true }).click()
  await writeFile(join(root, 'installed-handoff.json'), JSON.stringify({ status: 'passed', association, checks: ['Windows magnet ShellExecute', 'Windows .torrent ShellExecute'] }, null, 2))
  console.log('Installed magnet and .torrent handoffs passed')
} finally { if (app) await app.close() }
