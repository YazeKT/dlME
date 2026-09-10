import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assertLibraryPath, categoryFor, ensureDownloadFolders, isWithin, scanLibrary } from '../src/main/library'
import { parseExtractors } from '../src/main/sites'

const roots: string[] = []
async function root(): Promise<string> { const path = await mkdtemp(join(tmpdir(), 'dlme-test-')); roots.push(path); return path }
afterEach(async () => { await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true }))) })
describe('download library', () => {
  it('recognizes all six categories regardless of extension case', () => {
    expect(['song.MP3', 'clip.mp4', 'photo.webp', 'setup.exe', 'archive.7z', 'notes.pdf'].map(categoryFor)).toEqual(['Audio', 'Video', 'Image', 'Application', 'Zip', 'Others'])
  })
  it('scans completed files, ignores partial files, and survives absent roots', async () => {
    const path = await root(); await ensureDownloadFolders(path)
    await writeFile(join(path, 'Video', 'Unicode ’ example.mp4'), 'video')
    await writeFile(join(path, 'Video', 'active.mp4.part'), 'partial')
    await writeFile(join(path, 'notes.txt'), 'notes')
    const data = await scanLibrary(path, [], [join(path, 'absent')])
    expect(data.files.map((file) => file.category).sort()).toEqual(['Others', 'Video'])
    expect(data.warnings).toHaveLength(1)
  })
  it('keeps files accessible in remembered roots after history is cleared', async () => {
    const current = await root(); const previous = await root(); const file = join(previous, 'song.mp3')
    await writeFile(file, 'audio')
    expect((await scanLibrary(current, [], [previous])).files).toHaveLength(1)
    expect(await assertLibraryPath([current, previous], file)).toBe(file)
  })
  it('rejects traversal, prefix lookalikes, and junction escapes', async () => {
    const path = await root(); const outside = await root(); const file = join(outside, 'secret.txt'); await writeFile(file, 'secret')
    expect(isWithin(path, `${path}-other/file.txt`)).toBe(false)
    expect(isWithin(path, join(path, '..', 'secret.txt'))).toBe(false)
    await expect(assertLibraryPath([path], file)).rejects.toThrow('outside')
    await symlink(outside, join(path, 'escape'), process.platform === 'win32' ? 'junction' : 'dir')
    await expect(assertLibraryPath([path], join(path, 'escape', 'secret.txt'))).rejects.toThrow('outside')
    expect((await scanLibrary(path, [])).files).toHaveLength(0)
  })
})
it('keeps every official extractor and its broken flag', () => {
  const sites = parseExtractors('YouTube\n20min (CURRENTLY BROKEN)\nYouTube:playlist\ngeneric\n')
  expect(sites).toHaveLength(4)
  expect(sites.find((site) => site.name === '20min')?.broken).toBe(true)
  expect(sites.find((site) => site.name === 'YouTube:playlist')?.type).toBe('Collection')
})
