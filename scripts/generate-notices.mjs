import { readFile, readdir, writeFile, copyFile, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

const destination = resolve('resources/licenses')
await mkdir(destination, { recursive: true })
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'))
const sections = ['# Application dependency licenses\n\nGenerated from the installed production dependencies. These licenses apply to the named packages; they do not replace the separate engine licenses.']
const missing = []
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev) continue
  let pkg
  try { pkg = JSON.parse(await readFile(resolve(path, 'package.json'), 'utf8')) } catch { continue }
  const files = (await readdir(path)).filter((name) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(name))
  sections.push(`## ${pkg.name} ${pkg.version}\n\nLicense: ${typeof pkg.license === 'string' ? pkg.license : JSON.stringify(pkg.license)}\nSource: ${typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url ?? pkg.homepage ?? 'See package-lock.json'}`)
  if (!files.length) missing.push(pkg.name)
  for (const file of files) {
    try { sections.push(`### ${file}\n\n${await readFile(resolve(path, file), 'utf8')}`) } catch { /* not a text file */ }
  }
}
await writeFile(resolve(destination, 'APPLICATION-DEPENDENCIES.txt'), sections.join('\n\n'))
await copyFile('node_modules/electron/dist/LICENSE', resolve(destination, 'Electron-LICENSE.txt'))
await copyFile('node_modules/electron/dist/LICENSES.chromium.html', resolve(destination, 'Electron-Chromium-LICENSES.html'))
const manifest = JSON.parse(await readFile('resources/engine/runtime-manifest.json', 'utf8'))
manifest.ffmpeg.configureOutput = execFileSync(resolve('resources/engine/ffmpeg.exe'), ['-version'], { windowsHide: true, encoding: 'utf8' })
manifest.ffmpeg.license = 'GPL-3.0-or-later (GPL and version3 enabled)'
manifest.binaryChecksums = {}
for (const name of ['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe', 'deno.exe']) manifest.binaryChecksums[name] = createHash('sha256').update(await readFile(resolve('resources/engine', name))).digest('hex')
await writeFile('resources/engine/runtime-manifest.json', JSON.stringify(manifest, null, 2) + '\n')
await writeFile(resolve(destination, 'RUNTIME-BUILD-DETAILS.txt'), JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({ productionPackages: sections.filter((s) => s.startsWith('## ')).length, packagesWithoutLicenseFile: missing }))
