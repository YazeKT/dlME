import { describe, expect, it } from 'vitest'
import { buildFormatArguments } from '../src/main/format'
import type { DownloadOptions } from '../src/shared/types'

const base: DownloadOptions = { kind: 'video', quality: '1080', videoContainer: 'auto', audioContainer: 'mp3', audioQuality: '192', outputDirectory: 'C:\\Downloads' }

describe('format selection', () => {
  it('caps video quality and keeps safe fallback streams', () => {
    expect(buildFormatArguments(base)).toEqual(['--format', 'bestvideo*[height<=1080]+bestaudio/best[height<=1080]/best'])
  })
  it('requests an explicit merge container', () => {
    expect(buildFormatArguments({ ...base, videoContainer: 'mkv' })).toContain('mkv')
  })
  it('prefers compatible MP4 and M4A streams with a safe fallback', () => {
    const args = buildFormatArguments({ ...base, videoContainer: 'mp4' })
    expect(args[1]).toContain('[ext=mp4]+bestaudio[ext=m4a]')
    expect(args).toContain('--recode-video')
  })
  it('builds audio extraction arguments', () => {
    expect(buildFormatArguments({ ...base, kind: 'audio', audioContainer: 'mp3', audioQuality: '320' })).toEqual(['--format', 'bestaudio/best', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '320K'])
  })
  it('honors exact advanced stream selection', () => {
    expect(buildFormatArguments({ ...base, exactFormatId: '137+140' })).toEqual(['--format', '137+140'])
  })
})


it('converts an exact WebM source stream when MP4 is requested', () => {
  const args = buildFormatArguments({ ...base, exactFormatId: '248', videoContainer: 'mp4' })
  expect(args.slice(0, 2)).toEqual(['--format', '248'])
  expect(args).toContain('--recode-video')
  expect(args).toContain('mp4')
})
it('extracts audio even when keeping the best source format', () => {
  expect(buildFormatArguments({ ...base, kind: 'audio', audioContainer: 'best' })).toContain('--extract-audio')
})
