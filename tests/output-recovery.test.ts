import { afterEach, describe, expect, it } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { recoverFinalOutputPath } from '../src/main/engine'

const directories: string[] = []
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }) })

describe('completed output recovery', () => {
  it('finds the real Unicode filename by media id when the reported path contains a replacement character', () => {
    const directory = join(tmpdir(), `dime-output-${randomUUID()}`)
    directories.push(directory)
    mkdirSync(directory)
    const actual = join(directory, 'Is This Valve’s Biggest Leak [H6UC_ipdX-8].mp4')
    writeFileSync(actual, 'verified media fixture')
    const reported = join(directory, 'Is This Valve�s Biggest Leak [H6UC_ipdX-8].mp4')
    expect(recoverFinalOutputPath(reported, directory, 'https://www.youtube.com/watch?v=H6UC_ipdX-8', Date.now())).toBe(actual)
  })

  it('ignores partial files', () => {
    const directory = join(tmpdir(), `dime-output-${randomUUID()}`)
    directories.push(directory)
    mkdirSync(directory)
    writeFileSync(join(directory, 'Example [H6UC_ipdX-8].mp4.part'), 'partial')
    expect(recoverFinalOutputPath(undefined, directory, 'https://www.youtube.com/watch?v=H6UC_ipdX-8', Date.now())).toBeUndefined()
  })
})
