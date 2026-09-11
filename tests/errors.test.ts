import { describe, expect, it } from 'vitest'
import { classifyEngineError, isBrowserCookieAccessError, sanitizeEngineLog } from '../src/main/errors'

describe('engine error classification', () => {
  it.each([
    ['WARNING: failed to decrypt with DPAPI', 'cookie_decryption_failed'],
    ['ERROR: Could not copy Chrome cookie database. See https://github.com/yt-dlp/yt-dlp/issues/7271 for more info', 'cookie_decryption_failed'],
    ["PermissionError: [Errno 13] Permission denied: 'C:\\Users\\Example\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Network\\Cookies'", 'cookie_decryption_failed'],
    ['Sign in to confirm you are not a bot. Use cookies', 'authentication_required'],
    ['ERROR: [generic] Cloudflare anti-bot challenge; --extractor-args generic:impersonate', 'site_challenge'],
    ['HTTP Error 429: Too Many Requests', 'rate_limited'],
    ['This video is not available in your country', 'geo_blocked'],
    ['This video is DRM protected', 'drm_protected'],
    ['Unsupported URL', 'unsupported_url'],
    ['Requested format is not available', 'format_unavailable'],
    ['No space left on device', 'disk_full'],
    ['Permission denied', 'permission_denied']
  ])('maps %s to %s', (message, code) => expect(classifyEngineError(message).code).toBe(code))

  it('does not treat a normal destination permission failure as a cookie failure', () => {
    const message = 'Permission denied: D:\\Downloads\\Video\\output.mp4'
    expect(isBrowserCookieAccessError(message)).toBe(false)
    expect(classifyEngineError(message).code).toBe('permission_denied')
  })

  it('redacts Windows user-profile paths from engine logs', () => {
    const message = "PermissionError: C:\\Users\\Kirsten\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Network\\Cookies"
    expect(sanitizeEngineLog(message)).toBe('PermissionError: C:\\Users\\[redacted]\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Network\\Cookies')
  })
})
