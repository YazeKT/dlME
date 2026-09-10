import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const directory = resolve('resources/branding')
const source = resolve(directory, 'diME-source-logo.png')
await mkdir(directory, { recursive: true })
const sizes = [16, 24, 32, 48, 64, 128, 256]
const iconBuffers = []
for (const size of sizes) {
  const buffer = await sharp(source).trim().resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  await writeFile(resolve(directory, `diME-${size}.png`), buffer)
  if ([16, 24, 32, 48, 64, 128, 256].includes(size)) iconBuffers.push(buffer)
}
await sharp(source).trim().resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(resolve(directory, 'diME.png'))
await writeFile(resolve(directory, 'diME.ico'), await pngToIco(iconBuffers))
console.log(`Generated ${sizes.length + 2} diME icon assets in ${directory}`)
