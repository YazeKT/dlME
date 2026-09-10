import { describe, expect, it } from 'vitest'
import { parseChecksum } from '../src/main/checksum'

describe('signed checksum manifest parsing', () => {
  it('finds only the exact executable entry', () => {
    const hash = 'a'.repeat(64)
    expect(parseChecksum(`${hash} *yt-dlp.exe\n${'b'.repeat(64)} *yt-dlp_x86.exe`, 'yt-dlp.exe')).toBe(hash)
  })
  it('rejects a missing entry', () => expect(() => parseChecksum(`${'a'.repeat(64)} *other.exe`, 'yt-dlp.exe')).toThrow(/did not contain/))
})
