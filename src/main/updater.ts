import { app } from 'electron'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as openpgp from 'openpgp'
import type { EngineUpdateInfo } from '../shared/types'
import { DimeDatabase } from './database'
import { parseChecksum } from './checksum'

const execFileAsync = promisify(execFile)
const REPO_API = 'https://api.github.com/repos/yt-dlp/yt-dlp'

interface ReleaseAsset { name: string; browser_download_url: string }
interface Release { tag_name: string; body?: string; published_at?: string; assets: ReleaseAsset[] }

export class EngineUpdater {
  constructor(private readonly db: DimeDatabase, private readonly currentVersion: () => Promise<string>, private readonly notify: (message: string) => void) {}

  async check(): Promise<EngineUpdateInfo> {
    const [release, current] = await Promise.all([this.latestRelease(), this.currentVersion()])
    return { currentVersion: current, availableVersion: release.tag_name, updateAvailable: release.tag_name !== current, releaseNotes: release.body, publishedAt: release.published_at }
  }

  async install(): Promise<string> {
    const release = await this.latestRelease()
    this.notify(`Downloading yt-dlp ${release.tag_name}…`)
    const exeAsset = asset(release, 'yt-dlp.exe')
    const sumsAsset = asset(release, 'SHA2-256SUMS')
    const sigAsset = asset(release, 'SHA2-256SUMS.sig')
    const [exe, sums, signature] = await Promise.all([download(exeAsset.browser_download_url), download(sumsAsset.browser_download_url), download(sigAsset.browser_download_url)])
    this.notify('Verifying signed checksums…')
    await this.verifySignature(sums, signature)
    const expected = parseChecksum(new TextDecoder().decode(sums), 'yt-dlp.exe')
    const actual = createHash('sha256').update(exe).digest('hex')
    if (expected !== actual) throw new Error('The downloaded yt-dlp executable did not match its signed checksum.')
    const versionDirectory = join(app.getPath('userData'), 'engines', release.tag_name)
    const staging = `${versionDirectory}.staging`
    rmSync(staging, { recursive: true, force: true })
    mkdirSync(staging, { recursive: true })
    const stagedExe = join(staging, 'yt-dlp.exe')
    writeFileSync(stagedExe, exe)
    const { stdout } = await execFileAsync(stagedExe, ['--version'], { windowsHide: true, timeout: 30_000 })
    if (stdout.trim() !== release.tag_name) throw new Error('The downloaded engine failed its version smoke test.')
    rmSync(versionDirectory, { recursive: true, force: true })
    renameSync(staging, versionDirectory)
    const finalExe = join(versionDirectory, 'yt-dlp.exe')
    this.db.setEngine(release.tag_name, finalExe, true)
    this.notify(`yt-dlp ${release.tag_name} is active.`)
    return release.tag_name
  }

  async rollback(): Promise<string> {
    const previous = this.db.getRollbackEngine()
    if (!previous || !existsSync(previous.executablePath)) throw new Error('No previous engine version is available for rollback.')
    const { stdout } = await execFileAsync(previous.executablePath, ['--version'], { windowsHide: true, timeout: 30_000 })
    const version = stdout.trim()
    this.db.setEngine(version, previous.executablePath, true)
    this.notify(`Rolled back to yt-dlp ${version}.`)
    return version
  }

  private async latestRelease(): Promise<Release> {
  const response = await fetch(`${REPO_API}/releases/latest`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': `dlME/${app.getVersion()}` } })
    if (!response.ok) throw new Error(`Could not check for engine updates (HTTP ${response.status}).`)
    return await response.json() as Release
  }

  private async verifySignature(sums: Uint8Array, signature: Uint8Array): Promise<void> {
    const keyPath = app.isPackaged ? join(process.resourcesPath, 'engine', 'public.key') : resolve(app.getAppPath(), 'resources', 'engine', 'public.key')
    const key = await openpgp.readKey({ armoredKey: readFileSync(keyPath, 'utf8') })
    const message = await openpgp.createMessage({ binary: sums })
    const detached = await openpgp.readSignature({ binarySignature: signature })
    const result = await openpgp.verify({ message, signature: detached, verificationKeys: key })
    await result.signatures[0].verified
  }
}

function asset(release: Release, name: string): ReleaseAsset {
  const found = release.assets.find((candidate) => candidate.name === name)
  if (!found) throw new Error(`Official release ${release.tag_name} does not contain ${name}.`)
  return found
}

async function download(url: string): Promise<Uint8Array> {
  if (!url.startsWith('https://github.com/') && !url.startsWith('https://objects.githubusercontent.com/')) throw new Error('Refusing to download an engine update from an untrusted host.')
  const response = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': `dlME/${app.getVersion()}` } })
  if (!response.ok) throw new Error(`Engine update download failed (HTTP ${response.status}).`)
  return new Uint8Array(await response.arrayBuffer())
}
