import { app, Notification, shell } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { createServer } from 'node:net'
import type { DimeLogEntry, JobRecord, TorrentInput } from '../shared/types'
import type { DimeDatabase } from './database'
import { parseTorrent, validateMagnet, validateTorrentPath } from './torrent-metadata'
import { stopProcessTree } from './process-control'
import { sanitizeEngineLog } from './errors'

interface Status { gid: string; status: string; totalLength: string; completedLength: string; downloadSpeed: string; uploadSpeed: string; connections: string; numSeeders?: string; errorMessage?: string; files: { index: string; path: string; length: string; completedLength: string; selected: string }[]; bittorrent?: { info?: { name?: string } } }

export class TorrentEngine {
  private child?: ChildProcess
  private starting?: Promise<void>
  private port = 0
  private readonly secret = randomBytes(32).toString('hex')
  private readonly inputs = new Map<string, TorrentInput>()
  private readonly lookups = new Map<string, string>()
  private readonly jobs = new Map<string, string>()
  private readonly stopping = new Set<string>()
  private readonly root = join(app.getPath('userData'), 'torrents')
  private timer?: ReturnType<typeof setInterval>
  private ticking = false
  private closing = false
  private readonly reservations = new Set<string>()
  constructor(private db: DimeDatabase, private notify: (job: JobRecord) => void, private notifyInput: (input: TorrentInput) => void, private notifyLog: (entry: DimeLogEntry) => void, private wakeMedia: () => void) { mkdirSync(this.root, { recursive: true }) }
  activeCount(): number { return this.jobs.size + this.reservations.size }
  hasActiveJobs(): boolean { return this.activeCount() > 0 || this.lookups.size > 0 }
  getInputs(): TorrentInput[] { return [...this.inputs.values()] }
  async addInput(source: string): Promise<TorrentInput> {
    if (typeof source !== 'string') throw new Error('Invalid torrent input.')
    const magnet = /^magnet:/i.test(source)
    if (magnet) source = validateMagnet(source)
    else if (!isAbsolute(source) || !/\.torrent$/i.test(source) || !existsSync(source) || statSync(source).size > 10 * 1024 * 1024) throw new Error('Select an existing .torrent file smaller than 10 MB.')
    const existing = [...this.inputs.values()].find((input) => input.source === source)
    if (existing) { this.notifyInput(existing); return existing }
    const input: TorrentInput = { id: randomUUID(), source, name: magnet ? new URL(source).searchParams.get('dn') || 'Magnet download' : 'Torrent file', status: 'pending' }
    if (!magnet) {
      const saved = join(this.root, `${input.id}.torrent`)
      const parsed = parseTorrent(readFileSync(source), saved)
      copyFileSync(source, saved); Object.assign(input, parsed, { status: 'ready' })
    }
    this.inputs.set(input.id, input); this.notifyInput(input); return input
  }
  private emit(input: TorrentInput): TorrentInput { this.inputs.set(input.id, input); this.notifyInput(input); return input }
  async resolveInput(id: string): Promise<TorrentInput> {
    const input = this.inputs.get(id)
    if (!input) throw new Error('This torrent input was closed.')
    if (input.status === 'ready' || input.status === 'resolving') return input
    this.emit({ ...input, status: 'resolving', error: undefined })
    let gid: string | undefined
    try {
      await this.ensureStarted()
      if (!this.inputs.has(id)) throw new Error('Metadata lookup cancelled.')
      const lookupDirectory = join(this.root, id); mkdirSync(lookupDirectory, { recursive: true })
      gid = await this.rpc<string>('addUri', [[input.source], { dir: lookupDirectory, 'bt-metadata-only': 'true', 'bt-save-metadata': 'true', 'seed-time': '0' }])
      this.lookups.set(id, gid)
      const deadline = Date.now() + 120_000
      while (Date.now() < deadline && this.inputs.has(id) && !this.closing) {
        const metadata = readdirSync(lookupDirectory).find((file) => file.endsWith('.torrent'))
        if (metadata) {
          const path = join(lookupDirectory, metadata)
          const parsed = parseTorrent(readFileSync(path), path)
          return this.emit({ ...input, ...parsed, status: 'ready' })
        }
        const status = await this.rpc<Status>('tellStatus', [gid])
        if (status.status === 'error') throw new Error(status.errorMessage || 'Torrent metadata could not be retrieved.')
        await new Promise((done) => setTimeout(done, 350))
      }
      throw new Error(this.inputs.has(id) ? 'No metadata received after two minutes. Check peers or retry.' : 'Metadata lookup cancelled.')
    } catch (error) {
      if (!this.inputs.has(id)) throw error
      return this.emit({ ...input, status: 'error', error: (error as Error).message })
    } finally {
      this.lookups.delete(id)
      if (gid) await this.rpc('forceRemove', [gid]).catch(() => {})
    }
  }
  async cancelInput(id: string): Promise<void> {
    this.inputs.delete(id)
    const gid = this.lookups.get(id); this.lookups.delete(id)
    if (gid) await this.rpc('forceRemove', [gid])
  }
  async enqueue(request: { id: string; files: number[]; destination: string }): Promise<JobRecord> {
    const input = this.inputs.get(request.id)
    if (!input?.details || input.status !== 'ready') throw new Error('Wait for torrent metadata first.')
    if (!Array.isArray(request.files) || !request.files.length || request.files.some((index) => !Number.isInteger(index) || !input.details!.files.some((file) => file.index === index))) throw new Error('Select valid files to download.')
    if (typeof request.destination !== 'string' || !isAbsolute(request.destination)) throw new Error('Choose an absolute download destination.')
    const duplicate = this.db.listJobs().find((job) => job.options.torrent?.infoHash === input.details!.infoHash && !['completed', 'cancelled'].includes(job.state))
    if (duplicate) throw new Error('This torrent is already in your downloads. Resume or open the existing item.')
    const destination = resolve(request.destination)
    const details = { ...input.details, files: input.details.files.map((file) => ({ ...file, selected: request.files.includes(file.index) })) }
    mkdirSync(destination, { recursive: true })
    for (const file of details.files.filter((file) => file.selected)) {
      this.assertSafePath(destination, file.path)
      if (existsSync(join(destination, file.path))) throw new Error(`The destination already contains ${file.path}. Choose another folder to avoid overwriting it.`)
    }
    const job = this.db.createJob({ id: randomUUID(), sourceUrl: input.source, title: input.name, state: 'queued', options: { kind: 'video', quality: 'best', videoContainer: 'auto', audioContainer: 'best', audioQuality: 'best', outputDirectory: destination, torrent: details } })
    this.db.rememberDownloadRoot(destination); this.inputs.delete(input.id); this.notify(job)
    try { await this.ensureStarted(); void this.tick() } catch (error) { this.fail(job.id, error) }
    return this.db.getJob(job.id)!
  }
  private assertSafePath(root: string, path: string): void {
    validateTorrentPath(path)
    const target = resolve(root, path), rel = relative(root, target)
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('Torrent output escaped the selected folder.')
    let current = target
    // Check every existing ancestor, including junctions above the destination.
    while (true) { if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error('Torrent destination contains a junction or symbolic link. Choose a regular folder.'); const parent = dirname(current); if (parent === current) break; current = parent }
  }
  async pause(id: string, cancel = false): Promise<void> {
    const job = this.db.getJob(id)
    if (!job?.options.torrent || ['completed', 'cancelled'].includes(job.state)) return
    this.stopping.add(id)
    try {
      const gid = this.jobs.get(id)
      if (gid) {
        await this.rpc(cancel ? 'forceRemove' : 'forcePause', [gid])
        if (!cancel) {
          const state = await this.rpc<Status>('tellStatus', [gid])
          if (state.status !== 'paused') throw new Error('Torrent has not paused yet. Try again.')
          await this.rpc('forceRemove', [gid])
        }
        this.jobs.delete(id)
      }
      const latest = this.db.getJob(id)!
      if (cancel && !this.db.getSettings().keepPartialFiles) {
        for (const file of latest.options.torrent!.files) {
          this.assertSafePath(latest.options.outputDirectory, file.path)
          const path = join(latest.options.outputDirectory, file.path)
          if (existsSync(path) && lstatSync(path).isFile()) unlinkSync(path)
        }
        const first = latest.options.torrent!.files[0]?.path.split('/')[0]
        if (first) { const control = join(latest.options.outputDirectory, `${first}.aria2`); if (existsSync(control) && lstatSync(control).isFile() && !lstatSync(control).isSymbolicLink()) unlinkSync(control) }
      }
      this.notify(this.db.updateJob(id, { state: cancel ? 'cancelled' : 'paused', progress: { ...latest.progress, phase: cancel ? 'Cancelled' : 'Paused' } }))
      this.log(id, 'warning', cancel ? this.db.getSettings().keepPartialFiles ? 'Torrent cancelled. Downloaded data was kept.' : 'Torrent cancelled. Partial files were removed according to your preference.' : 'Torrent paused; downloaded pieces were preserved.')
    } finally { this.stopping.delete(id); this.wakeMedia() }
  }
  resume(id: string): void {
    const job = this.db.getJob(id)
    if (!job?.options.torrent || !['paused', 'blocked', 'cancelled'].includes(job.state)) throw new Error('This torrent cannot be resumed.')
    this.notify(this.db.updateJob(id, { state: 'queued', errorMessage: undefined, progress: { ...job.progress, phase: 'Queued' } }))
    void this.ensureStarted().then(() => this.tick()).catch((error) => this.fail(id, error))
  }
  private async tick(): Promise<void> {
    if (this.ticking || this.closing) return
    this.ticking = true
    try {
      for (const [id, gid] of this.jobs) {
        if (this.stopping.has(id)) continue
        const job = this.db.getJob(id); if (!job?.options.torrent) continue
        const status = await this.rpc<Status>('tellStatus', [gid])
        if (this.stopping.has(id) || !this.jobs.has(id)) continue
        if (status.status === 'error') { this.jobs.delete(id); this.fail(id, new Error(status.errorMessage || 'Torrent engine error.')); continue }
        const details = job.options.torrent
        details.files = details.files.map((file) => { const progress = status.files.find((entry) => Number(entry.index) === file.index); return { ...file, completed: Number(progress?.completedLength || 0) } })
        const selected = details.files.filter((file) => file.selected)
        const total = selected.reduce((sum, file) => sum + file.length, 0), completed = selected.reduce((sum, file) => sum + Math.min(file.length, file.completed || 0), 0)
        const speed = Number(status.downloadSpeed)
        const finished = status.status === 'complete'
        if (finished && selected.some((file) => !existsSync(join(job.options.outputDirectory, file.path)) || statSync(join(job.options.outputDirectory, file.path)).size !== file.length)) { this.jobs.delete(id); this.fail(id, new Error('Torrent finished but selected files are missing or have an unexpected size. Retry to check pieces.')); continue }
        if (finished) details.files = details.files.map((file) => ({ ...file, completed: file.selected ? file.length : file.completed }))
        const progress = { percent: finished ? 100 : total ? Math.min(99.9, completed / total * 100) : 0, downloadedBytes: finished ? total : completed, totalBytes: total, speed, uploadSpeed: Number(status.uploadSpeed), peers: Number(status.connections), seeders: Number(status.numSeeders || 0), eta: speed > 0 ? (total - completed) / speed : undefined, indeterminate: !total, phase: finished ? 'Completed' : speed > 0 ? 'Downloading' : Number(status.connections) ? 'Checking / connecting' : 'Waiting for peers' }
        this.notify(this.db.updateJob(id, { state: finished ? 'completed' : 'downloading', options: { ...job.options, torrent: details }, progress, size: finished ? total : undefined }))
        if (finished) {
          this.jobs.delete(id); this.log(id, 'success', 'Torrent complete. Selected files passed piece verification; post-download seeding stopped.')
          const settings = this.db.getSettings()
          if (settings.completionNotifications && Notification.isSupported()) new Notification({ title: 'dlME torrent complete', body: job.title, silent: !settings.completionSound }).show()
          if (settings.completionSound) shell.beep()
          this.wakeMedia()
        }
      }
      const count = this.db.listJobs().filter((job) => ['downloading', 'postprocessing'].includes(job.state)).length
      const queued = this.db.listRunnable().filter((job) => job.options.torrent && !this.reservations.has(job.id)).slice(0, Math.max(0, this.db.getSettings().maxConcurrent - count))
      for (const job of queued) {
        if (this.db.listJobs().filter((item) => ['downloading', 'postprocessing'].includes(item.state)).length + this.reservations.size >= this.db.getSettings().maxConcurrent) break
        this.reservations.add(job.id)
        try {
          const torrent = job.options.torrent!
          torrent.files.filter((file) => file.selected).forEach((file) => this.assertSafePath(job.options.outputDirectory, file.path))
          const gid = await this.rpc<string>('addTorrent', [readFileSync(torrent.metadataPath).toString('base64'), [], { dir: job.options.outputDirectory, 'select-file': torrent.files.filter((file) => file.selected).map((file) => file.index).join(','), 'seed-time': '0', 'check-integrity': 'true', 'bt-hash-check-seed': 'false', 'allow-overwrite': 'false', 'auto-file-renaming': 'false' }])
          if (this.db.getJob(job.id)?.state !== 'queued') { await this.rpc('forceRemove', [gid]); continue }
          this.jobs.set(job.id, gid); this.notify(this.db.updateJob(job.id, { state: 'downloading', attempts: job.attempts + 1, progress: { ...job.progress, phase: 'Checking / connecting' } }))
          this.log(job.id, 'info', 'Torrent started. Uploading may occur during downloading; transfer stops at completion.')
        } catch (error) { this.fail(job.id, error) } finally { this.reservations.delete(job.id) }
      }
    } catch (error) { if (!this.closing) this.log(undefined, 'error', `Torrent status unavailable: ${(error as Error).message}`) }
    finally { this.ticking = false }
  }
  private fail(id: string, error: unknown): void { const job = this.db.getJob(id); if (job && !['paused', 'cancelled'].includes(job.state)) { this.notify(this.db.updateJob(id, { state: 'blocked', errorCode: 'torrent_error', errorMessage: (error as Error).message })); this.log(id, 'error', (error as Error).message) } }
  private log(id: string | undefined, level: DimeLogEntry['level'], message: string): void { this.notifyLog(this.db.addLog(id, level, sanitizeEngineLog(message))) }
  private async rpc<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
    const response = await fetch(`http://127.0.0.1:${this.port}/jsonrpc`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: randomUUID(), method: `aria2.${method}`, params: [`token:${this.secret}`, ...params] }), signal: AbortSignal.timeout(8000) })
    const result = await response.json() as { result: T; error?: { message: string } }
    if (result.error) throw new Error(result.error.message)
    return result.result
  }
  private ensureStarted(): Promise<void> {
    if (this.starting) return this.starting
    if (this.child && this.port) return Promise.resolve()
    this.starting = this.launch().finally(() => { this.starting = undefined })
    return this.starting
  }
  private async launch(): Promise<void> {
    if (this.closing) throw new Error('dlME is shutting down.')
    const executable = app.isPackaged ? join(process.resourcesPath, 'engine', 'aria2c.exe') : resolve('resources/engine/aria2c.exe')
    if (!existsSync(executable)) throw new Error('The bundled torrent engine is missing. Reinstall dlME or fetch its runtimes.')
    const server = createServer(); await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done) }); this.port = (server.address() as { port: number }).port; await new Promise<void>((done) => server.close(() => done()))
    const child = spawn(executable, ['--no-conf', '--enable-rpc=true', '--rpc-listen-all=false', `--rpc-listen-port=${this.port}`, `--rpc-secret=${this.secret}`, '--rpc-allow-origin-all=false', '--seed-time=0', '--enable-dht=true', '--enable-peer-exchange=true', '--enable-dht6=false', `--dht-file-path=${join(this.root, 'dht.dat')}`, '--file-allocation=none', '--console-log-level=warn', '--download-result=hide'], { windowsHide: true, stdio: 'ignore' })
    this.child = child
    let launchError: Error | undefined
    child.once('error', (error) => { launchError = error })
    child.once('exit', () => { this.child = undefined; this.port = 0; if (this.timer) clearInterval(this.timer); for (const id of this.jobs.keys()) this.fail(id, new Error('Torrent engine exited. Retry this download.')); this.jobs.clear(); this.wakeMedia() })
    for (let attempt = 0; attempt < 40; attempt++) {
      if (launchError) throw launchError
      try { await this.rpc('getVersion'); this.timer = setInterval(() => void this.tick(), 1000); return } catch {}
      await new Promise((done) => setTimeout(done, 100))
    }
    if (child.pid) await stopProcessTree(child.pid).catch(() => {})
    throw new Error('Torrent engine did not start its local control interface.')
  }
  async shutdown(): Promise<void> {
    this.closing = true; if (this.timer) clearInterval(this.timer)
    for (const id of [...this.jobs.keys()]) await this.pause(id).catch(() => {})
    if (this.child) { await this.rpc('shutdown').catch(() => {}); const child = this.child; await new Promise<void>((done) => { if (child.exitCode !== null) return done(); const timer = setTimeout(() => { void stopProcessTree(child.pid).finally(done) }, 3000); child.once('exit', () => { clearTimeout(timer); done() }) }) }
  }
}
