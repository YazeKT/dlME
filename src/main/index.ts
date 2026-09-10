import { app, BrowserWindow, dialog, Menu, nativeImage, shell, Tray } from 'electron'
import { join, resolve } from 'node:path'
import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { DimeDatabase } from './database'
import { DownloadEngine } from './engine'
import { registerIpc } from './ipc'
import { EngineUpdater } from './updater'
import { ensureDownloadFolders } from './library'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false

// electron-builder sets this to the directory containing the portable executable.
// Keeping userData there makes portable dlME genuinely self-contained.
if (process.env.DLME_TEST_DATA) app.setPath('userData', resolve(process.env.DLME_TEST_DATA))
else if (process.env.PORTABLE_EXECUTABLE_DIR) app.setPath('userData', join(process.env.PORTABLE_EXECUTABLE_DIR, 'diME-data'))
else app.setPath('userData', join(app.getPath('appData'), 'dime-downloader'))

app.setName('dlME')
app.setAppUserModelId('com.dime.downloader')

async function createWindow(): Promise<void> {
  const iconPath = app.isPackaged ? join(process.resourcesPath, 'branding', 'diME.png') : resolve(app.getAppPath(), 'resources', 'branding', 'diME.png')
  mainWindow = new BrowserWindow({
    width: 1120, height: 760, minWidth: 900, minHeight: 650, show: false, frame: false, backgroundColor: '#000000',
    icon: existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true,
      webSecurity: true, allowRunningInsecureContent: false, spellcheck: false
    }
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => { if (url !== mainWindow?.webContents.getURL()) event.preventDefault() })
  mainWindow.webContents.on('render-process-gone', (_event, details) => writeCrashLog(`Renderer stopped: ${details.reason} (${details.exitCode})`))

  const db = new DimeDatabase()
  db.rememberDownloadRoot(db.getSettings().outputDirectory)
  await ensureDownloadFolders(db.getSettings().outputDirectory)
  const notifyJob = (job: unknown): void => { if (!mainWindow?.isDestroyed()) mainWindow?.webContents.send('dime:job-changed', job) }
  const notifyLog = (entry: unknown): void => { if (!mainWindow?.isDestroyed()) mainWindow?.webContents.send('dime:log', entry) }
  const engine = new DownloadEngine(db, notifyJob, notifyLog)
  const updater = new EngineUpdater(db, () => engine.version(), (message) => mainWindow?.webContents.send('dime:engine-update', message))
  registerIpc(mainWindow, db, engine, updater)
  app.setLoginItemSettings({ openAtLogin: db.getSettings().launchAtStartup })

  mainWindow.on('close', async (event) => {
    if (quitting || !engine.hasActiveJobs()) return
    event.preventDefault()
    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'question', title: 'Downloads are still running', message: 'Keep dlME running in the background?',
      detail: 'Choose Keep Running to continue downloads in the system tray. Choose Stop & Exit to preserve partial files and close dlME.',
      buttons: ['Keep Running', 'Stop & Exit', 'Cancel'], defaultId: 0, cancelId: 2, noLink: true
    })
    if (result.response === 0) { mainWindow?.hide(); ensureTray(iconPath, engine) }
    else if (result.response === 1) { await engine.shutdown(); quitting = true; app.quit() }
  })
  mainWindow.on('closed', () => { mainWindow = null })
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.once('did-finish-load', () => {
    if (db.getSettings().engineAutoCheck) void updater.check().then((info) => {
      mainWindow?.webContents.send('dime:engine-update', info.updateAvailable ? `yt-dlp ${info.availableVersion} is available` : `yt-dlp ${info.currentVersion} is current`)
    }).catch((error) => writeCrashLog(`Engine update check failed: ${error instanceof Error ? error.message : String(error)}`))
  })
  if (process.env.ELECTRON_RENDERER_URL) await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  else await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

function ensureTray(iconPath: string, engine: DownloadEngine): void {
  if (tray) return
  const image = existsSync(iconPath) ? nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 }) : nativeImage.createEmpty()
  tray = new Tray(image)
  tray.setToolTip('dlME')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open dlME', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: 'Exit', click: () => { void engine.shutdown().then(() => { quitting = true; app.quit() }) } }
  ]))
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
}

app.whenReady().then(async () => {
  await createWindow()
  app.on('activate', () => { if (!mainWindow) void createWindow(); else mainWindow.show() })
}).catch((error) => {
  writeCrashLog(`Startup failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
  dialog.showErrorBox('dlME could not start', 'A startup error was recorded in the dlME crash log. Contact Yaze Media support if this continues.')
  app.quit()
})

app.on('before-quit', () => { quitting = true })
app.on('window-all-closed', () => { if (process.platform !== 'darwin' && !tray) app.quit() })
app.on('child-process-gone', (_event, details) => writeCrashLog(`Child process stopped: ${details.type} ${details.reason} (${details.exitCode})`))

function writeCrashLog(message: string): void {
  try {
    const directory = join(app.getPath('userData'), 'logs')
    mkdirSync(directory, { recursive: true })
    appendFileSync(join(directory, 'crash.log'), `${new Date().toISOString()} ${message}\n`, 'utf8')
  } catch { /* logging must never crash the app */ }
}
