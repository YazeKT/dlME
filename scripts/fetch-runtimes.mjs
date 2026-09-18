import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const destination = resolve('resources/engine')
const release = JSON.parse(await readFile(resolve('package.json'), 'utf8')).version
const versions = {
  ytDlp: '2026.08.19',
  deno: 'v2.9.6',
  ffmpegRelease: 'autobuild-2026-08-31-20-15',
  ffmpegAsset: 'ffmpeg-N-126374-g089a48eb36-win64-gpl.zip'
}
const expected = {
  ytDlpExe: '66674953fe251b89f4d08c5f0e35e0728679bd67ab3d7d05c0562af101dd3e7a',
  denoZip: '15e5300b0ba3c3695a7621d90160a746ec9e710228cee639afa9d580f6e3cd11',
  ffmpegZip: 'fc496061ed2cc5264d7c9c4ec929365f15267aeb40c94fd34ce637a0ea6ce229'
}
const headers = { Accept: 'application/octet-stream', 'User-Agent': `dlME-release/${release}` }

await mkdir(destination, { recursive: true })

const ytUrl = `https://github.com/yt-dlp/yt-dlp/releases/download/${versions.ytDlp}/yt-dlp.exe`
const denoUrl = `https://github.com/denoland/deno/releases/download/${versions.deno}/deno-x86_64-pc-windows-msvc.zip`
const ffmpegUrl = `https://github.com/yt-dlp/FFmpeg-Builds/releases/download/${versions.ffmpegRelease}/${versions.ffmpegAsset}`

const [ytExe, denoZip, ffmpegZip] = await Promise.all([download(ytUrl), download(denoUrl), download(ffmpegUrl)])
verify(ytExe, expected.ytDlpExe, 'yt-dlp.exe')
verify(denoZip, expected.denoZip, 'Deno archive')
verify(ffmpegZip, expected.ffmpegZip, 'FFmpeg archive')
await writeFile(resolve(destination, 'yt-dlp.exe'), ytExe)

const denoZipPath = resolve(destination, 'deno.zip')
await writeFile(denoZipPath, denoZip)
expand(denoZipPath, destination)
await rm(denoZipPath, { force: true })

const ffmpegZipPath = resolve(destination, 'ffmpeg.zip')
const ffmpegExpanded = resolve(destination, 'ffmpeg-expanded')
await writeFile(ffmpegZipPath, ffmpegZip)
await rm(ffmpegExpanded, { recursive: true, force: true })
expand(ffmpegZipPath, ffmpegExpanded)
for (const name of ['ffmpeg.exe', 'ffprobe.exe']) {
  const source = await findFile(ffmpegExpanded, name)
  if (!source) throw new Error(`FFmpeg archive did not contain ${name}`)
  await copyFile(source, resolve(destination, name))
}
await rm(ffmpegExpanded, { recursive: true, force: true })
await rm(ffmpegZipPath, { force: true })

const aria2Url = 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip'
const aria2Checksum = '67d015301eef0b612191212d564c5bb0a14b5b9c4796b76454276a4d28d9b288'
const aria2Zip = await download(aria2Url)
verify(aria2Zip, aria2Checksum, 'aria2 archive')
const aria2Archive = resolve(destination, 'aria2.zip')
const aria2Expanded = resolve(destination, 'aria2-expanded')
await writeFile(aria2Archive, aria2Zip)
expand(aria2Archive, aria2Expanded)
await copyFile(await findFile(aria2Expanded, 'aria2c.exe'), resolve(destination, 'aria2c.exe'))
await mkdir(resolve('resources/licenses'), { recursive: true })
for (const name of ['COPYING', 'LICENSE.OpenSSL', 'README.mingw', 'AUTHORS']) await copyFile(await findFile(aria2Expanded, name), resolve('resources/licenses', `aria2-${name}.txt`))
await rm(aria2Archive, { force: true })
await rm(aria2Expanded, { recursive: true, force: true })

const manifest = {
  release,
  generatedAt: new Date().toISOString(),
  aria2: { version: '1.37.0', archiveSha256: aria2Checksum, sha256: createHash('sha256').update(await readFile(resolve(destination, 'aria2c.exe'))).digest('hex'), url: aria2Url, source: 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0.tar.xz', buildRecipes: 'https://github.com/aria2/aria2/blob/release-1.37.0/README.mingw', license: 'GPL-2.0-or-later' },
  ytDlp: { version: versions.ytDlp, sha256: expected.ytDlpExe, url: ytUrl, source: `https://github.com/yt-dlp/yt-dlp/tree/${versions.ytDlp}` },
  deno: { version: versions.deno, archiveSha256: expected.denoZip, url: denoUrl, source: `https://github.com/denoland/deno/tree/${versions.deno}` },
  ffmpeg: {
    version: 'N-126374-g089a48eb36-20260831',
    release: versions.ffmpegRelease,
    archive: versions.ffmpegAsset,
    archiveSha256: expected.ffmpegZip,
    url: ffmpegUrl,
    sourceRevision: '089a48eb36',
    source: 'https://github.com/FFmpeg/FFmpeg/commit/089a48eb36',
    buildRecipes: `https://github.com/yt-dlp/FFmpeg-Builds/tree/${versions.ffmpegRelease}`,
    license: 'GPL-3.0-or-later'
  }
}
await writeFile(resolve(destination, 'runtime-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Fetched pinned runtimes for dlME ${manifest.release}.`)

async function download(url) {
  const response = await fetch(url, { headers, redirect: 'follow' })
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status} ${url}`)
  return Buffer.from(await response.arrayBuffer())
}

function verify(bytes, checksum, label) {
  const actual = createHash('sha256').update(bytes).digest('hex')
  if (actual !== checksum) throw new Error(`${label} checksum mismatch: expected ${checksum}, received ${actual}`)
}

function expand(archive, target) {
  const result = spawnSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${archive.replaceAll("'", "''")}' -DestinationPath '${target.replaceAll("'", "''")}' -Force`], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`Could not extract ${archive}`)
}

async function findFile(directory, filename) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      const nested = await findFile(path, filename)
      if (nested) return nested
    } else if (entry.name.toLowerCase() === filename.toLowerCase()) return path
  }
}
