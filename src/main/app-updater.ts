import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { AppUpdateInfo } from '../shared/types'

export class AppUpdater {
  private state: AppUpdateInfo = { state: 'idle', currentVersion: app.getVersion() }

  constructor(private readonly notify: (state: AppUpdateInfo) => void) {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.allowPrerelease = false
    autoUpdater.on('checking-for-update', () => this.emit({ state: 'checking' }))
    autoUpdater.on('update-available', (info) => this.emit({ state: 'available', availableVersion: info.version, message: `dlME ${info.version} is available.` }))
    autoUpdater.on('update-not-available', (info) => this.emit({ state: 'current', availableVersion: info.version, message: 'dlME is up to date.' }))
    autoUpdater.on('download-progress', (progress) => this.emit({ state: 'downloading', percent: progress.percent, message: `Downloading ${Math.round(progress.percent)}%` }))
    autoUpdater.on('update-downloaded', (info) => this.emit({ state: 'downloaded', availableVersion: info.version, percent: 100, message: 'Update ready. Restart to install.' }))
    autoUpdater.on('error', (error) => this.emit({ state: 'error', message: sanitizeUpdateError(error.message) }))
  }

  current(): AppUpdateInfo { return this.state }

  async check(): Promise<AppUpdateInfo> {
    if (!app.isPackaged) return this.emit({ state: 'current', message: 'App updates are checked in packaged builds.' })
    await autoUpdater.checkForUpdates()
    return this.state
  }

  async download(): Promise<void> {
    if (this.state.state !== 'available') throw new Error('No app update is ready to download.')
    await autoUpdater.downloadUpdate()
  }

  install(): void {
    if (this.state.state !== 'downloaded') throw new Error('Download the app update before installing it.')
    autoUpdater.quitAndInstall(false, true)
  }

  private emit(patch: Partial<AppUpdateInfo>): AppUpdateInfo {
    this.state = { ...this.state, ...patch, currentVersion: app.getVersion() }
    this.notify(this.state)
    return this.state
  }
}

function sanitizeUpdateError(message: string): string {
  return message.replace(/https?:\/\/[^\s]+/gi, '[release server]').replace(/[A-Z]:\\[^\r\n]+/gi, '[local path]').slice(0, 500)
}
