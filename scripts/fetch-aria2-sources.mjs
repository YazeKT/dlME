import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, join } from 'node:path'

const destination = resolve(process.argv[2] || 'release-source/aria2-sources')
await mkdir(destination, { recursive: true })
const sources = [
  ['aria2-1.37.0.tar.xz', 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0.tar.xz', '60a420ad7085eb616cb6e2bdf0a7206d68ff3d37fb5a956dc44242eb2f79b66b'],
  ['gmp-6.3.0.tar.xz', 'https://mirrors.kernel.org/gnu/gmp/gmp-6.3.0.tar.xz', 'a3c2b80201b89e68616f4ad30bc66aee4927c3ce50e33929ca819d5c43538898'],
  ['expat-2.5.0.tar.xz', 'https://github.com/libexpat/libexpat/releases/download/R_2_5_0/expat-2.5.0.tar.xz', 'ef2420f0232c087801abf705e89ae65f6257df6b7931d37846a193ef2e8cdcbe'],
  ['sqlite-3.43.1-source.zip', 'https://github.com/sqlite/sqlite/archive/refs/tags/version-3.43.1.zip', '81baacd2912eac91ca161eb4c04c87bfaa59ba0de6ebd0ab5ebf3914ab46b3d6'],
  ['zlib-1.3.tar.gz', 'https://github.com/madler/zlib/releases/download/v1.3/zlib-1.3.tar.gz', 'ff0ba4c292013dbc27530b3a81e1f9a813cd39de01ca5e0f8bf355702efa593e'],
  ['c-ares-1.19.1.tar.gz', 'https://github.com/c-ares/c-ares/releases/download/cares-1_19_1/c-ares-1.19.1.tar.gz', '321700399b72ed0e037d0074c629e7741f6b2ec2dda92956abe3e9671d3e268e'],
  ['libssh2-1.11.0.tar.gz', 'https://github.com/libssh2/libssh2/releases/download/libssh2-1.11.0/libssh2-1.11.0.tar.gz', '3736161e41e2693324deb38c26cfdc3efe6209d634ba4258db1cecff6a5ad461']
]
const manifest = await Promise.all(sources.map(async ([name, url, expected]) => {
  const path = join(destination, name)
  let data
  try { try { data = await readFile(path) } catch { data = await readFile(resolve('release-source/aria2-sources', name)) } if (!data.length || (expected && createHash('sha256').update(data).digest('hex') !== expected)) throw new Error('Invalid cached source') } catch { await run(process.platform === 'win32' ? 'curl.exe' : 'curl', ['--http1.1', '--location', '--fail', '--retry', '3', '--max-time', '180', '--output', path, url], { windowsHide: true }); data = await readFile(path) }
  if (!data.length) throw new Error(`${name}: empty source archive`)
  const sha256 = createHash('sha256').update(data).digest('hex')
  if (expected && sha256 !== expected) throw new Error(`${name}: source checksum mismatch`)
  await writeFile(path, data)
  return { file: name, sha256, source: url }
}))
await writeFile(join(destination, 'SOURCE-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify(manifest))
