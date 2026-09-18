import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { parseTorrent, validateMagnet, validateTorrentPath } from '../src/main/torrent-metadata'

function encode(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return Buffer.concat([Buffer.from(`${value.length}:`), value])
  if (typeof value === 'string') return encode(Buffer.from(value))
  if (typeof value === 'number') return Buffer.from(`i${value}e`)
  if (Array.isArray(value)) return Buffer.concat([Buffer.from('l'), ...value.map(encode), Buffer.from('e')])
  return Buffer.concat([Buffer.from('d'), ...Object.entries(value as object).sort(([a], [b]) => a.localeCompare(b)).flatMap(([key, item]) => [encode(key), encode(item)]), Buffer.from('e')])
}
const info = { name: 'Mixed files', 'piece length': 16384, pieces: Buffer.alloc(20), files: [{ length: 12, path: ['game.exe'] }, { length: 0, path: ['Documents', 'notes.txt'] }] }
describe('torrent metadata and Windows path boundaries', () => {
  it('keeps executable and document payloads and hashes the original info bytes', () => {
    const parsed = parseTorrent(encode({ info }), '/metadata.torrent')
    expect(parsed.details.infoHash).toBe(createHash('sha1').update(encode(info)).digest('hex'))
    expect(parsed.details.files.map((file) => file.path)).toEqual(['Mixed files/game.exe', 'Mixed files/Documents/notes.txt'])
  })
  it.each(['../escape', 'folder/../escape', 'C:/escape', 'folder\\escape', 'AUX.txt', 'folder/file:stream', 'folder/file.'])('rejects unsafe paths: %s', (path) => expect(() => validateTorrentPath(path)).toThrow())
  it('rejects pure v2 metadata explicitly', () => expect(() => parseTorrent(encode({ info: { name: 'v2', 'meta version': 2, 'file tree': {} } }), 'v2.torrent')).toThrow(/v2/))
  it('accepts v1 magnets and rejects unrelated protocols', () => {
    expect(validateMagnet(`magnet:?xt=urn:btih:${'a'.repeat(40)}&dn=Example`)).toContain('magnet:')
    expect(() => validateMagnet('https://example.com')).toThrow()
    expect(() => validateMagnet(`magnet:?xt=urn:btmh:${'a'.repeat(64)}`)).toThrow(/v1/)
  })
  it('rejects truncated input and conflicting Windows filenames', () => {
    expect(() => parseTorrent(Buffer.from('d4:info'), 'bad.torrent')).toThrow()
    expect(() => parseTorrent(encode({ info: { ...info, files: [{ length: 1, path: ['A.txt'] }, { length: 1, path: ['a.txt'] }] } }), 'bad.torrent')).toThrow(/conflicting/)
  })
})
