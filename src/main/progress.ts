import type { JobProgress } from '../shared/types'

export function parseProgress(line: string): JobProgress {
  const [, status = '', downloaded = '', total = '', speed = '', eta = '', percentText = '', , videoCodec = '', audioCodec = ''] = line.split('|')
  const totalBytes = numberOrUndefined(total)
  const downloadedBytes = numberOrUndefined(downloaded)
  const parsed = Number(percentText.replace('%', '').trim())
  const percent = Math.max(0, Math.min(100, Number.isFinite(parsed) ? parsed : totalBytes && downloadedBytes !== undefined ? downloadedBytes / totalBytes * 100 : status === 'finished' ? 100 : 0))
  return {
    percent,
    indeterminate: status !== 'finished' && !totalBytes && !Number.isFinite(parsed),
    downloadedBytes: numberOrUndefined(downloaded),
    totalBytes: numberOrUndefined(total),
    speed: numberOrUndefined(speed),
    eta: numberOrUndefined(eta),
    phase: status === 'finished' ? 'Post-processing' : videoCodec === 'none' ? 'Downloading audio' : audioCodec === 'none' ? 'Downloading video' : 'Downloading'
  }
}

function numberOrUndefined(value: unknown): number | undefined {
  const number = Number(value)
  return value !== '' && Number.isFinite(number) && number >= 0 ? number : undefined
}

export class LineBuffer {
  private remainder = ''
  push(chunk: string): string[] {
    const lines = (this.remainder + chunk).split(/\r\n|\n|\r/)
    this.remainder = lines.pop() ?? ''
    return lines
  }
  flush(): string[] { const final = this.remainder; this.remainder = ''; return final.trim() ? [final] : [] }
}
