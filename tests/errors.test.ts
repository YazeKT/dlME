import { describe, expect, it } from 'vitest'
import { classifyEngineError } from '../src/main/errors'

describe('engine error classification', () => {
  it.each([
    ['WARNING: failed to decrypt with DPAPI', 'cookie_decryption_failed'],
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
})
