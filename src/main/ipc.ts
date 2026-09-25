import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { existsSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { AnalyzeRequest, AppSettings, EnqueueRequest } from '../shared/types'
import { detectBrowsers } from './browsers'
import { DimeDatabase } from './database'
import { DownloadEngine } from './engine'
import { EngineUpdater } from './updater'
import type { TorrentEngine } from './torrents'
import type { AppUpdater } from './app-updater'
import { assertLibraryPath, ensureDownloadFolders, libraryRoots, scanLibrary } from './library'
import { importLegalDocument, readLegalDocuments } from './legal'

export function registerIpc(window: BrowserWindow, db: DimeDatabase, engine: DownloadEngine, updater: EngineUpdater, appUpdater: AppUpdater, torrents: TorrentEngine): void {
  const isTorrent = (id: string): boolean => Boolean(db.getJob(assertId(id))?.options.torrent)
  ipcMain.handle('dime:torrent-inputs', () => torrents.getInputs())
  ipcMain.handle('dime:torrent-add-input', (_event, source: string) => torrents.addInput(source))
  ipcMain.handle('dime:torrent-resolve', (_event, id: string) => torrents.resolveInput(assertId(id)))
  ipcMain.handle('dime:torrent-close', (_event, id: string) => torrents.cancelInput(assertId(id)))
  ipcMain.handle('dime:torrent-enqueue', (_event, request) => torrents.enqueue(assertObject(request)))
  ipcMain.handle('dime:torrent-import', async () => { const result = await dialog.showOpenDialog(window, { filters: [{ name: 'Torrent metadata', extensions: ['torrent'] }], properties: ['openFile'] }); return result.canceled ? null : torrents.addInput(result.filePaths[0]) })
  ipcMain.handle('dime:torrent-association', async (_event, register?: boolean) => {
    if (register && (!app.isPackaged || process.env.PORTABLE_EXECUTABLE_DIR)) throw new Error('Install dlME to register browser magnet links.')
    if (register) { app.setAsDefaultProtocolClient('magnet'); await shell.openExternal('ms-settings:defaultapps') }
    return app.isDefaultProtocolClient('magnet')
  })
  ipcMain.handle('dime:torrent-folder', async (_event, id: string) => { const job = db.getJob(assertId(id)); if (!job?.options.torrent) throw new Error('Unknown torrent.'); const error = await shell.openPath(job.options.outputDirectory); if (error) throw new Error(error) })
  ipcMain.handle('dime:app-info', async () => ({ version: app.getVersion(), engineVersion: await engine.version() }))
  ipcMain.handle('dime:supported-sites', () => engine.supportedSites())
  ipcMain.handle('dime:library', () => scanLibrary(db.getSettings().outputDirectory, db.listJobs(), db.getDownloadRoots()))
  ipcMain.handle('dime:legal-documents', () => readLegalDocuments())
  ipcMain.handle('dime:import-legal', () => importLegalDocument(window))
  ipcMain.handle('dime:open-download-folder', async () => { const root = db.getSettings().outputDirectory; await ensureDownloadFolders(root); const error = await shell.openPath(root); if (error) throw new Error(error) })
  ipcMain.handle('dime:analyze', (_event, request: AnalyzeRequest) => engine.analyze(assertObject(request)))
  ipcMain.handle('dime:enqueue', (_event, request: EnqueueRequest) => engine.enqueue(assertObject(request)))
  ipcMain.handle('dime:pause', (_event, id: string) => isTorrent(id) ? torrents.pause(id) : engine.pause(assertId(id)))
  ipcMain.handle('dime:resume', (_event, id: string) => isTorrent(id) ? torrents.resume(id) : engine.resume(assertId(id)))
  ipcMain.handle('dime:cancel', (_event, id: string) => isTorrent(id) ? torrents.pause(id, true) : engine.cancel(assertId(id)))
  ipcMain.handle('dime:retry', (_event, id: string) => isTorrent(id) ? torrents.resume(id) : engine.retry(assertId(id)))
  ipcMain.handle('dime:select-folder', async () => {
    const result = await dialog.showOpenDialog(window, { properties: ['openDirectory', 'createDirectory'], defaultPath: db.getSettings().outputDirectory })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('dime:reveal', async (_event, path: string) => { const safe = await assertLibraryPath([...libraryRoots(db.getSettings().outputDirectory, db.listJobs()), ...db.getDownloadRoots()], path); shell.showItemInFolder(safe) })
  ipcMain.handle('dime:open', async (_event, path: string) => { const safe = await assertLibraryPath([...libraryRoots(db.getSettings().outputDirectory, db.listJobs()), ...db.getDownloadRoots()], path); const error = await shell.openPath(safe); if (error) throw new Error(error) })
  ipcMain.handle('dime:history', () => db.listJobs())
  ipcMain.handle('dime:remove-history', (_event, id: string) => db.removeJob(assertId(id)))
  ipcMain.handle('dime:clear-history', () => db.clearHistory())
  ipcMain.handle('dime:get-settings', () => db.getSettings())
  ipcMain.handle('dime:update-settings', (_event, patch: Partial<AppSettings>) => {
    const settings = db.updateSettings(assertObject(patch))
    if (typeof patch.launchAtStartup === 'boolean') app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup })
    return settings
  })
  ipcMain.handle('dime:detect-browsers', () => detectBrowsers())
  ipcMain.handle('dime:get-logs', (_event, jobId?: string) => db.listLogs(jobId ? assertId(jobId) : undefined))
  ipcMain.handle('dime:clear-logs', () => db.clearLogs())
  ipcMain.handle('dime:export-diagnostics', async (_event, jobId?: string) => {
    const selectedId = jobId ? assertId(jobId) : undefined
    const result = await dialog.showSaveDialog(window, { title: 'Export dlME diagnostics', defaultPath: `dlME-diagnostics-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'JSON diagnostics', extensions: ['json'] }] })
    if (result.canceled || !result.filePath) return null
    const settings = db.getSettings()
    const jobs = db.listJobs().filter((job) => !selectedId || job.id === selectedId).map((job) => ({ ...job, options: { ...job.options, browser: job.options.browser ? { ...job.options.browser, profile: job.options.browser.profile ? '[selected profile]' : undefined } : undefined } }))
    writeFileSync(result.filePath, JSON.stringify({ product: 'dlME', version: app.getVersion(), exportedAt: new Date().toISOString(), engine: await engine.version(), settings: { ...settings, browserAccess: { ...settings.browserAccess, profile: settings.browserAccess.profile ? '[selected profile]' : undefined } }, jobs, logs: db.listLogs(selectedId) }, null, 2), 'utf8')
    return result.filePath
  })
  ipcMain.handle('dime:open-documentation', (_event, document: string) => {
    if (!['guide', 'troubleshooting', 'changelog'].includes(document)) throw new Error('Unknown documentation page.')
    const name = document === 'guide' ? 'USER-GUIDE.html' : document === 'troubleshooting' ? 'TROUBLESHOOTING.html' : 'CHANGELOG.md'
    const path = app.isPackaged ? join(process.resourcesPath, 'docs', name) : resolve(app.getAppPath(), 'resources', 'docs', name)
    return shell.openPath(path).then((error) => { if (error) throw new Error(error) })
  })
  ipcMain.handle('dime:open-account-page', (_event, service: string) => {
    const pages: Record<string, string> = { youtube: 'https://www.youtube.com/account', vimeo: 'https://vimeo.com/log_in', soundcloud: 'https://soundcloud.com/signin', twitch: 'https://www.twitch.tv/login' }
    const url = pages[service]
    if (!url) throw new Error('Unknown account service.')
    return shell.openExternal(url)
  })
  ipcMain.handle('dime:open-support-email', () => shell.openExternal('mailto:kirstentrimaley@gmail.com?subject=dlME%20Support'))
  ipcMain.handle('dime:check-engine-update', () => updater.check())
  ipcMain.handle('dime:install-engine-update', () => updater.install())
  ipcMain.handle('dime:rollback-engine', () => updater.rollback())
  ipcMain.handle('dime:check-app-update', () => appUpdater.check())
  ipcMain.handle('dime:download-app-update', () => appUpdater.download())
  ipcMain.handle('dime:install-app-update', () => appUpdater.install())
  ipcMain.handle('dime:window-minimize', () => window.minimize())
  ipcMain.handle('dime:window-toggle-maximize', () => { window.isMaximized() ? window.unmaximize() : window.maximize(); return window.isMaximized() })
  ipcMain.handle('dime:window-close', () => window.close())
}

function assertObject<T>(value: T): T { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request.'); return value }
function assertId(value: string): string { if (typeof value !== 'string' || !/^[a-f0-9-]{30,40}$/i.test(value)) throw new Error('Invalid job identifier.'); return value }
function assertExistingPath(value: string): string { if (typeof value !== 'string') throw new Error('Invalid path.'); const path = resolve(value); if (!existsSync(path)) throw new Error('The downloaded file no longer exists.'); return path }
function assertOwnedOutputPath(db: DimeDatabase, value: string): string {
  const path = assertExistingPath(value)
  if (!db.ownsOutputPath(path)) throw new Error('This path is not a recorded dlME output.')
  return path
}
