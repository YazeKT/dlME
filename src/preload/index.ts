import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { AppUpdateInfo, DimeApi, DimeLogEntry, JobRecord } from '../shared/types'

const api: DimeApi = {
  importTorrent: () => ipcRenderer.invoke('dime:torrent-import'),
  addTorrentInput: (source) => ipcRenderer.invoke('dime:torrent-add-input', source),
  getTorrentInputs: () => ipcRenderer.invoke('dime:torrent-inputs'),
  resolveTorrent: (id) => ipcRenderer.invoke('dime:torrent-resolve', id),
  cancelTorrentInput: (id) => ipcRenderer.invoke('dime:torrent-close', id),
  enqueueTorrent: (request) => ipcRenderer.invoke('dime:torrent-enqueue', request),
  torrentAssociation: (register) => ipcRenderer.invoke('dime:torrent-association', register),
  openTorrentFolder: (id) => ipcRenderer.invoke('dime:torrent-folder', id),
  onTorrentInput: (callback) => subscribe('dime:torrent-input', callback),
  getDroppedTorrentPath: (file) => webUtils.getPathForFile(file),
  getAppInfo: () => ipcRenderer.invoke('dime:app-info'),
  getSupportedSites: () => ipcRenderer.invoke('dime:supported-sites'),
  listDownloadedFiles: () => ipcRenderer.invoke('dime:library'),
  openDownloadFolder: () => ipcRenderer.invoke('dime:open-download-folder'),
  getLegalDocuments: () => ipcRenderer.invoke('dime:legal-documents'),
  importLegalDocument: () => ipcRenderer.invoke('dime:import-legal'),
  analyzeUrl: (request) => ipcRenderer.invoke('dime:analyze', request),
  enqueueDownload: (request) => ipcRenderer.invoke('dime:enqueue', request),
  pauseJob: (id) => ipcRenderer.invoke('dime:pause', id),
  resumeJob: (id) => ipcRenderer.invoke('dime:resume', id),
  cancelJob: (id) => ipcRenderer.invoke('dime:cancel', id),
  retryJob: (id) => ipcRenderer.invoke('dime:retry', id),
  selectDownloadFolder: () => ipcRenderer.invoke('dime:select-folder'),
  revealFile: (path) => ipcRenderer.invoke('dime:reveal', path),
  openFile: (path) => ipcRenderer.invoke('dime:open', path),
  getHistory: () => ipcRenderer.invoke('dime:history'),
  removeHistoryRecord: (id) => ipcRenderer.invoke('dime:remove-history', id),
  clearHistory: () => ipcRenderer.invoke('dime:clear-history'),
  getSettings: () => ipcRenderer.invoke('dime:get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('dime:update-settings', settings),
  detectBrowsers: () => ipcRenderer.invoke('dime:detect-browsers'),
  getLogs: (jobId) => ipcRenderer.invoke('dime:get-logs', jobId),
  clearLogs: () => ipcRenderer.invoke('dime:clear-logs'),
  exportDiagnostics: (jobId) => ipcRenderer.invoke('dime:export-diagnostics', jobId),
  openDocumentation: (document) => ipcRenderer.invoke('dime:open-documentation', document),
  openAccountPage: (service) => ipcRenderer.invoke('dime:open-account-page', service),
  openSupportEmail: () => ipcRenderer.invoke('dime:open-support-email'),
  checkEngineUpdate: () => ipcRenderer.invoke('dime:check-engine-update'),
  installEngineUpdate: () => ipcRenderer.invoke('dime:install-engine-update'),
  rollbackEngine: () => ipcRenderer.invoke('dime:rollback-engine'),
  checkAppUpdate: () => ipcRenderer.invoke('dime:check-app-update'),
  downloadAppUpdate: () => ipcRenderer.invoke('dime:download-app-update'),
  installAppUpdate: () => ipcRenderer.invoke('dime:install-app-update'),
  windowMinimize: () => ipcRenderer.invoke('dime:window-minimize'),
  windowToggleMaximize: () => ipcRenderer.invoke('dime:window-toggle-maximize'),
  windowClose: () => ipcRenderer.invoke('dime:window-close'),
  onJobChanged: (callback) => subscribe<JobRecord>('dime:job-changed', callback),
  onLog: (callback) => subscribe<DimeLogEntry>('dime:log', callback),
  onEngineUpdate: (callback) => subscribe<string>('dime:engine-update', callback),
  onAppUpdate: (callback) => subscribe<AppUpdateInfo>('dime:app-update', callback)
}

function subscribe<T>(channel: string, callback: (value: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, value: T): void => callback(value)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('dime', api)
