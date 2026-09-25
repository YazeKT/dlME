import { join } from 'node:path'
import type { AppSettings, MediaKind } from '../shared/types'

export function buildOutputTemplate(outputDirectory: string, kind: MediaKind, filenameStyle: AppSettings['filenameStyle']): string {
  const baseName = kind === 'audio'
    ? '%(artist,creator,uploader|Unknown artist)s - %(title).150B'
    : '%(title).170B'
  return join(outputDirectory, filenameStyle === 'title-only' ? `${baseName}.%(ext)s` : `${baseName} [%(id)s].%(ext)s`)
}

export function buildMetadataArguments(settings: Pick<AppSettings, 'embedMetadata' | 'embedThumbnail' | 'saveMetadataSidecar' | 'saveThumbnailSidecar' | 'keepOriginalMedia'>): string[] {
  return [
    ...(settings.embedMetadata ? ['--embed-metadata', '--embed-chapters', '--embed-info-json'] : []),
    ...(settings.embedThumbnail ? ['--embed-thumbnail'] : []),
    ...(settings.saveMetadataSidecar ? ['--write-info-json', '--no-write-playlist-metafiles'] : []),
    ...(settings.saveThumbnailSidecar ? ['--write-thumbnail', '--no-write-playlist-metafiles'] : []),
    ...(settings.keepOriginalMedia ? ['--keep-video'] : [])
  ]
}
