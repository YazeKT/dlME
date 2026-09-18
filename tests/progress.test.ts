import { describe, expect, it } from 'vitest'
import { parseProgress, LineBuffer } from '../src/main/progress'

describe('structured progress parsing', () => {
  it('buffers split markers and flushes final lines', () => {
    const lines = new LineBuffer()
    expect(lines.push('__DIME_PRO')).toEqual([])
    expect(lines.push('GRESS__|downloading|1|2|1|1|50%\nlast')).toEqual(['__DIME_PROGRESS__|downloading|1|2|1|1|50%'])
    expect(lines.flush()).toEqual(['last'])
  })
  it('uses byte totals if a percentage is unavailable', () => expect(parseProgress('__DIME_PROGRESS__|downloading|50|100|NA|NA|NA').percent).toBe(50))
  it('shows unknown totals as indeterminate', () => expect(parseProgress('__DIME_PROGRESS__|downloading|50|NA|NA|NA|NA')).toMatchObject({ indeterminate: true, percent: 0 }))
  it('parses numeric progress without human log scraping', () => {
    expect(parseProgress('__DIME_PROGRESS__|downloading|512|1024|256|2| 50.0%')).toMatchObject({ percent: 50, downloadedBytes: 512, totalBytes: 1024, speed: 256, eta: 2, phase: 'Downloading' })
  })
  it('moves finished downloads into post-processing', () => {
    expect(parseProgress('__DIME_PROGRESS__|finished|1024|1024|NA|NA|100%')).toMatchObject({ percent: 100, phase: 'Post-processing' })
  })
})
