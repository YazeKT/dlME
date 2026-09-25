import { describe, expect, it } from 'vitest'
import { buildMetadataArguments, buildOutputTemplate } from '../src/main/media-output'

describe('media output policy', () => {
  it('uses creator-first names for audio and source titles for video', () => {
    expect(buildOutputTemplate('C:\\Downloads', 'audio', 'title-id')).toContain('%(artist,creator,uploader|Unknown artist)s - %(title).150B [%(id)s].%(ext)s')
    expect(buildOutputTemplate('C:\\Downloads', 'video', 'title-only')).toContain('%(title).170B.%(ext)s')
  })

  it('enables rich metadata, artwork, sidecars, and source retention independently', () => {
    const all = buildMetadataArguments({ embedMetadata: true, embedThumbnail: true, saveMetadataSidecar: true, saveThumbnailSidecar: true, keepOriginalMedia: true })
    expect(all).toEqual(expect.arrayContaining(['--embed-metadata', '--embed-thumbnail', '--embed-info-json', '--write-info-json', '--write-thumbnail', '--keep-video']))
    expect(buildMetadataArguments({ embedMetadata: false, embedThumbnail: false, saveMetadataSidecar: false, saveThumbnailSidecar: false, keepOriginalMedia: false })).toEqual([])
  })
})
