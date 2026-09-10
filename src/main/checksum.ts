export function parseChecksum(manifest: string, filename: string): string {
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = manifest.match(new RegExp(`^([a-f0-9]{64})\\s+\\*?${escaped}$`, 'mi'))
  if (!match) throw new Error(`The signed checksum manifest did not contain ${filename}.`)
  return match[1].toLowerCase()
}
