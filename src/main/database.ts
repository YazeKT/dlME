import Database from 'better-sqlite3'
import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { AppSettings, DimeLogEntry, DownloadOptions, JobProgress, JobRecord, JobState } from '../shared/types'

const defaultProgress: JobProgress = { percent: 0, phase: 'Queued' }

export class DimeDatabase {
  private readonly db: Database.Database

  constructor(path = join(app.getPath('userData'), 'dime.sqlite3')) {
    mkdirSync(dirname(path), { recursive: true })
    this.db = new Database(path)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.migrate()
    this.recoverInterruptedJobs()
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        source_url TEXT NOT NULL,
        title TEXT NOT NULL,
        thumbnail TEXT,
        state TEXT NOT NULL,
        progress_json TEXT NOT NULL,
        options_json TEXT NOT NULL,
        output_path TEXT,
        size INTEGER,
        error_code TEXT,
        error_message TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS jobs_updated_idx ON jobs(updated_at DESC);
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS logs_created_idx ON logs(created_at DESC);
      CREATE TABLE IF NOT EXISTS engine_versions (
        version TEXT PRIMARY KEY,
        executable_path TEXT NOT NULL,
        installed_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0,
        is_bundled INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS download_roots (path TEXT PRIMARY KEY);
    `)
    for (const job of this.listJobs()) this.rememberDownloadRoot(job.options.outputDirectory)
    if (!this.db.prepare("SELECT value FROM settings WHERE key = 'beta09Migrated'").get()) {
      this.db.prepare("UPDATE settings SET value = ? WHERE key = 'defaultVideoContainer' AND value = ?").run('"mp4"', '"auto"')
      this.db.prepare("INSERT INTO settings(key,value) VALUES ('beta09Migrated','true')").run()
    }
  }

  rememberDownloadRoot(path: string): void { this.db.prepare('INSERT OR IGNORE INTO download_roots(path) VALUES(?)').run(path) }
  getDownloadRoots(): string[] { return (this.db.prepare('SELECT path FROM download_roots').all() as { path: string }[]).map((row) => row.path) }

  private recoverInterruptedJobs(): void {
    const now = new Date().toISOString()
    this.db.prepare(`UPDATE jobs SET state = 'paused', error_code = NULL,
      error_message = 'The previous dlME session ended before this download finished. Resume when ready.',
      updated_at = ? WHERE state IN ('analyzing', 'downloading', 'postprocessing')`).run(now)
  }

  getSettings(): AppSettings {
    const downloads = join(app.getPath('downloads'), 'dlME')
    const defaults: AppSettings = {
      outputDirectory: downloads,
      maxConcurrent: 2,
      theme: 'oled',
      accentColor: '#00f5a0',
      launchAtStartup: false,
      keepPartialFiles: true,
      browserAccess: { enabled: false },
      defaultQuality: '1080',
      defaultVideoContainer: 'mp4',
      defaultAudioContainer: 'mp3',
      retryLimit: 3,
      connectionTimeout: 30,
      concurrentFragments: 4,
      playlistPacing: 0.5,
      completionNotifications: true,
      completionSound: true,
      engineAutoCheck: true,
      filenameStyle: 'title-id',
      tutorialCompleted: false
    }
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
    for (const row of rows) {
      try { (defaults as unknown as Record<string, unknown>)[row.key] = JSON.parse(row.value) } catch { /* ignore corrupt setting */ }
    }
    defaults.maxConcurrent = Math.max(1, Math.min(4, Number(defaults.maxConcurrent) || 2))
    defaults.retryLimit = Math.max(1, Math.min(8, Number(defaults.retryLimit) || 3))
    defaults.connectionTimeout = Math.max(10, Math.min(120, Number(defaults.connectionTimeout) || 30))
    defaults.concurrentFragments = Math.max(1, Math.min(8, Number(defaults.concurrentFragments) || 4))
    defaults.playlistPacing = Math.max(0, Math.min(5, Number(defaults.playlistPacing) || 0.5))
    if (!['oled', 'charcoal', 'light'].includes(defaults.theme)) defaults.theme = 'oled'
    if (!/^#[0-9a-f]{6}$/i.test(defaults.accentColor)) defaults.accentColor = '#00f5a0'
    return defaults
  }

  updateSettings(patch: Partial<AppSettings>): AppSettings {
    const allowed = new Set<keyof AppSettings>(['outputDirectory', 'maxConcurrent', 'theme', 'accentColor', 'launchAtStartup', 'keepPartialFiles', 'browserAccess', 'defaultQuality', 'defaultVideoContainer', 'defaultAudioContainer', 'retryLimit', 'connectionTimeout', 'concurrentFragments', 'playlistPacing', 'completionNotifications', 'completionSound', 'engineAutoCheck', 'filenameStyle', 'tutorialCompleted'])
    const write = this.db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    const transaction = this.db.transaction(() => {
      for (const [key, value] of Object.entries(patch)) if (allowed.has(key as keyof AppSettings) && value !== undefined) write.run(key, JSON.stringify(value))
    })
    transaction()
    if (patch.outputDirectory) this.rememberDownloadRoot(patch.outputDirectory)
    return this.getSettings()
  }

  createJob(input: Omit<JobRecord, 'createdAt' | 'updatedAt' | 'attempts' | 'progress'> & { progress?: JobProgress }): JobRecord {
    const now = new Date().toISOString()
    const job: JobRecord = { ...input, progress: input.progress ?? defaultProgress, attempts: 0, createdAt: now, updatedAt: now }
    this.db.prepare(`INSERT INTO jobs(id,parent_id,source_url,title,thumbnail,state,progress_json,options_json,output_path,size,error_code,error_message,attempts,created_at,updated_at)
      VALUES(@id,@parentId,@sourceUrl,@title,@thumbnail,@state,@progress,@options,@outputPath,@size,@errorCode,@errorMessage,@attempts,@createdAt,@updatedAt)`)
      .run(this.toRow(job))
    return job
  }

  updateJob(id: string, patch: Partial<JobRecord>): JobRecord {
    const existing = this.getJob(id)
    if (!existing) throw new Error(`Unknown download job: ${id}`)
    const next: JobRecord = { ...existing, ...patch, updatedAt: new Date().toISOString() }
    this.db.prepare(`UPDATE jobs SET parent_id=@parentId,source_url=@sourceUrl,title=@title,thumbnail=@thumbnail,state=@state,
      progress_json=@progress,options_json=@options,output_path=@outputPath,size=@size,error_code=@errorCode,error_message=@errorMessage,
      attempts=@attempts,updated_at=@updatedAt WHERE id=@id`).run(this.toRow(next))
    return next
  }

  getJob(id: string): JobRecord | undefined {
    const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.fromRow(row) : undefined
  }

  listJobs(): JobRecord[] {
    return (this.db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all() as Array<Record<string, unknown>>).map((row) => this.fromRow(row))
  }

  listRunnable(): JobRecord[] {
    return (this.db.prepare("SELECT * FROM jobs WHERE state = 'queued' ORDER BY created_at ASC").all() as Array<Record<string, unknown>>).map((row) => this.fromRow(row))
  }

  removeJob(id: string): void {
    const job = this.getJob(id)
    if (!job) return
    if (!['completed', 'cancelled'].includes(job.state)) throw new Error('Pause or cancel this item before removing it from history.')
    this.db.prepare('DELETE FROM jobs WHERE id = ?').run(id)
  }
  clearHistory(): void { this.db.prepare("DELETE FROM jobs WHERE state IN ('completed','cancelled')").run() }

  ownsOutputPath(path: string): boolean {
    return Boolean(this.db.prepare('SELECT 1 FROM jobs WHERE output_path = ? LIMIT 1').get(path))
  }

  addLog(jobId: string | undefined, level: DimeLogEntry['level'], message: string): DimeLogEntry {
    const createdAt = new Date().toISOString()
    const result = this.db.prepare('INSERT INTO logs(job_id,level,message,created_at) VALUES(?,?,?,?)').run(jobId ?? null, level, message.slice(0, 2000), createdAt)
    this.db.prepare('DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY id DESC LIMIT 1000)').run()
    return { id: String(result.lastInsertRowid), jobId, level, message: message.slice(0, 2000), createdAt }
  }

  listLogs(jobId?: string): DimeLogEntry[] {
    const rows = (jobId
      ? this.db.prepare('SELECT * FROM logs WHERE job_id = ? ORDER BY id DESC LIMIT 300').all(jobId)
      : this.db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT 300').all()) as Array<Record<string, unknown>>
    return rows.map((row) => ({ id: String(row.id), jobId: row.job_id ? String(row.job_id) : undefined, level: String(row.level) as DimeLogEntry['level'], message: String(row.message), createdAt: String(row.created_at) }))
  }

  clearLogs(): void { this.db.prepare('DELETE FROM logs').run() }

  setEngine(version: string, executablePath: string, active: boolean, bundled = false): void {
    const tx = this.db.transaction(() => {
      if (active) this.db.prepare('UPDATE engine_versions SET is_active = 0').run()
      this.db.prepare(`INSERT INTO engine_versions(version,executable_path,installed_at,is_active,is_bundled) VALUES(?,?,?,?,?)
        ON CONFLICT(version) DO UPDATE SET executable_path=excluded.executable_path,is_active=excluded.is_active,is_bundled=excluded.is_bundled`)
        .run(version, executablePath, new Date().toISOString(), active ? 1 : 0, bundled ? 1 : 0)
    })
    tx()
  }

  getActiveEngine(): { version: string; executablePath: string } | undefined {
    const row = this.db.prepare('SELECT version, executable_path FROM engine_versions WHERE is_active = 1 LIMIT 1').get() as { version: string; executable_path: string } | undefined
    return row ? { version: row.version, executablePath: row.executable_path } : undefined
  }

  getRollbackEngine(): { version: string; executablePath: string } | undefined {
    const row = this.db.prepare('SELECT version, executable_path FROM engine_versions WHERE is_active = 0 ORDER BY installed_at DESC LIMIT 1').get() as { version: string; executable_path: string } | undefined
    return row ? { version: row.version, executablePath: row.executable_path } : undefined
  }

  private toRow(job: JobRecord): Record<string, unknown> {
    return {
      id: job.id, parentId: job.parentId ?? null, sourceUrl: job.sourceUrl, title: job.title, thumbnail: job.thumbnail ?? null,
      state: job.state, progress: JSON.stringify(job.progress), options: JSON.stringify(job.options), outputPath: job.outputPath ?? null,
      size: job.size ?? null, errorCode: job.errorCode ?? null, errorMessage: job.errorMessage ?? null, attempts: job.attempts,
      createdAt: job.createdAt, updatedAt: job.updatedAt
    }
  }

  private fromRow(row: Record<string, unknown>): JobRecord {
    return {
      id: String(row.id), parentId: row.parent_id ? String(row.parent_id) : undefined, sourceUrl: String(row.source_url), title: String(row.title),
      thumbnail: row.thumbnail ? String(row.thumbnail) : undefined, state: String(row.state) as JobState,
      progress: JSON.parse(String(row.progress_json)) as JobProgress, options: JSON.parse(String(row.options_json)) as DownloadOptions,
      outputPath: row.output_path ? String(row.output_path) : undefined, size: row.size == null ? undefined : Number(row.size),
      errorCode: row.error_code ? String(row.error_code) : undefined, errorMessage: row.error_message ? String(row.error_message) : undefined,
      attempts: Number(row.attempts), createdAt: String(row.created_at), updatedAt: String(row.updated_at)
    }
  }
}
