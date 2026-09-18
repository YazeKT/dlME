import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
export async function stopProcessTree(pid?: number): Promise<void> {
  if (!pid) throw new Error('The download process did not supply a process ID.')
  if (process.platform !== 'win32') {
    try { process.kill(pid, 'SIGTERM') } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error }
    return
  }
  try {
    await run('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, timeout: 10_000 })
  } catch (error) {
    // A job can finish between the click and taskkill. Verify absence rather than
    // accepting all taskkill failures as successful cancellation.
    const { stdout } = await run('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { windowsHide: true, timeout: 5000 })
    if (stdout.includes(`"${pid}"`)) throw new Error(`Could not stop this download. Try again or exit dlME. ${(error as Error).message}`)
  }
  try { process.kill(pid, 0); throw new Error('The download process is still running. Try stopping it again.') }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error }
}
