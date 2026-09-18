import { createHash } from 'node:crypto'
import { isAbsolute, win32 } from 'node:path'
import type { TorrentDetails } from '../shared/types'

type BValue = Buffer | number | BValue[] | { [key: string]: BValue }
export function parseTorrent(data: Buffer, metadataPath: string): { name: string; details: TorrentDetails } {
  if (!data.length || data.length > 10 * 1024 * 1024) throw new Error('Torrent metadata must be between 1 byte and 10 MB.')
  let offset = 0, infoStart = -1, infoEnd = -1, nodes = 0
  const read = (depth = 0): BValue => {
    if (depth > 64 || ++nodes > 200_000 || offset >= data.length) throw new Error('Invalid or excessively complex torrent metadata.')
    const tag = data[offset]
    if (tag === 105) {
      const end = data.indexOf(101, ++offset)
      const raw = data.subarray(offset, end).toString()
      if (end < 0 || !/^-?(0|[1-9]\d*)$/.test(raw)) throw new Error('Invalid torrent integer.')
      offset = end + 1; const value = Number(raw)
      if (!Number.isSafeInteger(value)) throw new Error('Torrent integer exceeds supported size.')
      return value
    }
    if (tag === 108 || tag === 100) {
      offset++; const list: BValue[] = []; const dict: { [key: string]: BValue } = Object.create(null)
      while (data[offset] !== 101) {
        if (tag === 108) list.push(read(depth + 1))
        else {
          const key = read(depth + 1)
          if (!Buffer.isBuffer(key)) throw new Error('Invalid torrent dictionary.')
          const name = key.toString('utf8'); const start = offset; const value = read(depth + 1)
          if (Object.hasOwn(dict, name)) throw new Error('Duplicate torrent metadata key.')
          dict[name] = value
          if (depth === 0 && name === 'info') { infoStart = start; infoEnd = offset }
        }
      }
      offset++; return tag === 108 ? list : dict
    }
    const colon = data.indexOf(58, offset)
    const raw = data.subarray(offset, colon).toString()
    if (colon < 0 || !/^(0|[1-9]\d*)$/.test(raw)) throw new Error('Invalid torrent string.')
    const length = Number(raw); offset = colon + 1
    if (!Number.isSafeInteger(length) || offset + length > data.length) throw new Error('Truncated torrent metadata.')
    const value = data.subarray(offset, offset + length); offset += length; return value
  }
  const root = read() as Record<string, BValue>
  if (offset !== data.length || !root || Array.isArray(root) || Buffer.isBuffer(root) || infoStart < 0) throw new Error('Invalid torrent metadata.')
  const info = root.info as Record<string, BValue>
  if (!info || !Buffer.isBuffer(info.pieces)) throw new Error('Pure BitTorrent v2 torrents are not supported in this release. Use a v1 or hybrid torrent.')
  const text = (value: BValue): string => { if (!Buffer.isBuffer(value)) throw new Error('Invalid torrent filename.'); return value.toString('utf8') }
  const name = text(info['name.utf-8'] ?? info.name)
  validateTorrentPath(name)
  if (name.includes('/')) throw new Error('Torrent name must be a single folder or filename.')
  const length = (value: BValue): number => { if (typeof value !== 'number' || value < 0) throw new Error('Invalid torrent file size.'); return value }
  const files = Array.isArray(info.files) ? info.files.map((entry, index) => {
    const file = entry as Record<string, BValue>
    const parts = file['path.utf-8'] ?? file.path
    if (!Array.isArray(parts) || !parts.length) throw new Error('Invalid torrent file path.')
    const components = parts.map(text); components.forEach((part) => { validateTorrentPath(part); if (part.includes('/')) throw new Error('Invalid torrent path component.') })
    const path = [name, ...components].join('/'); validateTorrentPath(path)
    return { index: index + 1, path, length: length(file.length) }
  }) : [{ index: 1, path: name, length: length(info.length) }]
  if (!files.length || files.length > 100_000) throw new Error('Torrent file count is unsupported.')
  const unique = new Set(files.map((file) => file.path.toLowerCase()))
  if (unique.size !== files.length) throw new Error('Torrent contains conflicting Windows filenames.')
  const trackers: string[] = []
  if (Buffer.isBuffer(root.announce)) trackers.push(root.announce.toString())
  if (Array.isArray(root['announce-list'])) for (const tier of root['announce-list']) if (Array.isArray(tier)) for (const tracker of tier) if (Buffer.isBuffer(tracker)) trackers.push(tracker.toString())
  return { name, details: { infoHash: createHash('sha1').update(data.subarray(infoStart, infoEnd)).digest('hex'), files, metadataPath, trackers: [...new Set(trackers)] } }
}

export function validateTorrentPath(path: string): void {
  if (!path || isAbsolute(path) || win32.isAbsolute(path) || path.includes('\\') || path.split('/').some((part) => !part || part === '.' || part === '..' || /[<>:"|?*\x00-\x1f]/.test(part) || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new Error('Torrent contains a filename that is unsafe or unsupported on Windows.')
}

export function validateMagnet(source: string): string {
  if (typeof source !== 'string' || source.length > 64 * 1024) throw new Error('Invalid magnet link.')
  const url = new URL(source)
  if (url.protocol !== 'magnet:') throw new Error('Paste a magnet link or import a .torrent file.')
  const hash = url.searchParams.getAll('xt').find((xt) => /^urn:btih:(?:[a-f0-9]{40}|[a-z2-7]{32})$/i.test(xt))
  if (!hash) throw new Error('This magnet needs a BitTorrent v1 info hash. Pure v2 magnets are not supported.')
  return url.toString()
}
