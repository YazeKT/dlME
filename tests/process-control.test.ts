import { it, expect } from 'vitest'
import { spawn } from 'node:child_process'
import { stopProcessTree } from '../src/main/process-control'

it.skipIf(process.platform !== 'win32')('terminates the complete Windows process tree', async () => {
  const parent = spawn(process.execPath, ['-e', `const {spawn}=require('node:child_process'); const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}); console.log(child.pid); setInterval(()=>{},1000)`], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  const childPid = await new Promise<number>((done, reject) => { parent.stdout!.once('data', (data) => done(Number(data.toString().trim()))); parent.once('error', reject) })
  try {
    await stopProcessTree(parent.pid)
    expect(() => process.kill(parent.pid!, 0)).toThrow()
    expect(() => process.kill(childPid, 0)).toThrow()
  } finally { await stopProcessTree(parent.pid).catch(() => {}) }
}, 15000)
