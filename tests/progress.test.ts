import { describe, expect, it } from 'vitest'
import { parseProgress } from '../src/main/progress'

describe('structured progress parsing', () => {
  it('parses numeric progress without human log scraping', () => {
    expect(parseProgress('__DIME_PROGRESS__|downloading|512|1024|256|2| 50.0%')).toMatchObject({ percent: 50, downloadedBytes: 512, totalBytes: 1024, speed: 256, eta: 2, phase: 'Downloading' })
  })
  it('moves finished downloads into post-processing', () => {
    expect(parseProgress('__DIME_PROGRESS__|finished|1024|1024|NA|NA|100%')).toMatchObject({ percent: 100, phase: 'Post-processing' })
  })
})
