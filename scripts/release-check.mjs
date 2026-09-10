import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve('.')
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const required = [
  'LICENSE', 'NOTICE', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md', 'SUPPORT.md',
  'THIRD-PARTY-NOTICES.md', 'docs/INSTALLATION.md', 'docs/USER-GUIDE.md', 'docs/BUILDING.md',
  'docs/ARCHITECTURE.md', 'docs/PRIVACY.md', 'docs/LEGAL.md', 'docs/ENGINE-PROVENANCE.md',
  'resources/engine/runtime-manifest.json'
]
const errors = []
for (const file of required) if (!existsSync(resolve(root, file))) errors.push(`Missing required file: ${file}`)
if (pkg.name !== 'dlme' || pkg.version !== '0.9.0' || pkg.license !== 'MIT' || pkg.private !== true) errors.push('package.json release identity is inconsistent')

const manifest = JSON.parse(await readFile(resolve(root, 'resources/engine/runtime-manifest.json'), 'utf8'))
const expectedBinaries = {
  'yt-dlp.exe': manifest.ytDlp.sha256,
  'ffmpeg.exe': manifest.binaryChecksums?.['ffmpeg.exe'],
  'ffprobe.exe': manifest.binaryChecksums?.['ffprobe.exe'],
  'deno.exe': manifest.binaryChecksums?.['deno.exe']
}
for (const [name, expected] of Object.entries(expectedBinaries)) {
  const path = resolve(root, 'resources/engine', name)
  if (!existsSync(path) || !expected) continue
  const actual = createHash('sha256').update(await readFile(path)).digest('hex')
  if (actual !== expected) errors.push(`${name} does not match runtime-manifest.json`)
}

const tracked = gitFiles()
const blockedParts = [/^backups\//i, /^release\//i, /^verification\//i, /^node_modules/i, /^yt-dlp-master\//i, /^plugin-source\//i, /^context\//i]
for (const file of tracked) {
  if (blockedParts.some((pattern) => pattern.test(file))) errors.push(`Generated or local path is tracked: ${file}`)
  const info = await stat(resolve(root, file))
  if (info.size > 25 * 1024 * 1024) errors.push(`Tracked file exceeds 25 MiB: ${file}`)
}

if (process.env.DLME_BINARY_RELEASE === '1') {
  const marker = resolve(root, 'release-source', 'dlME-0.9.0-corresponding-source', 'SOURCE-PACKAGE-COMPLETE.txt')
  if (!existsSync(marker)) errors.push('Binary release blocked: verified corresponding-source completion marker is missing')
}

if (errors.length) {
  console.error(errors.map((item) => `- ${item}`).join('\n'))
  process.exit(1)
}
console.log(JSON.stringify({ status: 'passed', version: pkg.version, checkedFiles: tracked.length, binaryReleaseGate: process.env.DLME_BINARY_RELEASE === '1' }))

function gitFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) return []
  return result.stdout.split('\0').filter(Boolean).map((file) => relative(root, resolve(root, file)).replaceAll('\\', '/'))
}
