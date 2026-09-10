import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { BrowserProfile } from '../shared/types'

export function detectBrowsers(): BrowserProfile[] {
  const local = process.env.LOCALAPPDATA ?? ''
  const roaming = process.env.APPDATA ?? ''
  const definitions: Array<{ browser: BrowserProfile['browser']; label: string; path: string }> = [
    { browser: 'chrome', label: 'Google Chrome', path: join(local, 'Google', 'Chrome', 'User Data') },
    { browser: 'edge', label: 'Microsoft Edge', path: join(local, 'Microsoft', 'Edge', 'User Data') },
    { browser: 'brave', label: 'Brave', path: join(local, 'BraveSoftware', 'Brave-Browser', 'User Data') },
    { browser: 'firefox', label: 'Mozilla Firefox', path: join(roaming, 'Mozilla', 'Firefox', 'Profiles') }
  ]
  return definitions.map((definition) => ({
    browser: definition.browser, label: definition.label, installed: existsSync(definition.path), profiles: findProfiles(definition.path, definition.browser === 'firefox')
  }))
}

function findProfiles(path: string, firefox: boolean): string[] {
  if (!existsSync(path)) return []
  try {
    return readdirSync(path, { withFileTypes: true }).filter((entry) => entry.isDirectory() && (firefox || entry.name === 'Default' || entry.name.startsWith('Profile '))).map((entry) => entry.name)
  } catch { return [] }
}
