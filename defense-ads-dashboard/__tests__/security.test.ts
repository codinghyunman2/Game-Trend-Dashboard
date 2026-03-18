/**
 * Security utility unit tests
 *
 * Run: npm test
 *
 * These tests cover all pure-function utilities in lib/security.ts.
 * No Next.js runtime is needed — all tested functions accept plain arguments.
 */

import {
  extractClientIp,
  createRateLimiter,
  validateKeywords,
  isBodyTooLarge,
  safeCompareSecret,
  isAllowedExternalUrl,
  validateSelfCallBaseUrl,
} from '../lib/security'

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeHeaders(headers: Record<string, string>): { get(name: string): string | null } {
  return {
    get: (name: string) => headers[name.toLowerCase()] ?? null,
  }
}

// ─── extractClientIp ─────────────────────────────────────────────────────────

describe('extractClientIp', () => {
  test('returns x-real-ip when present and public', () => {
    const h = makeHeaders({ 'x-real-ip': '1.2.3.4' })
    expect(extractClientIp(h)).toBe('1.2.3.4')
  })

  test('falls back to rightmost non-private x-forwarded-for entry', () => {
    const h = makeHeaders({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' })
    expect(extractClientIp(h)).toBe('3.3.3.3')
  })

  test('skips private IPs at the right of x-forwarded-for', () => {
    // Rightmost is 192.168 (private), so fall back to 1.1.1.1
    const h = makeHeaders({ 'x-forwarded-for': '1.1.1.1, 192.168.1.1' })
    expect(extractClientIp(h)).toBe('1.1.1.1')
  })

  test('returns unknown when all x-forwarded-for entries are private', () => {
    const h = makeHeaders({ 'x-forwarded-for': '10.0.0.1, 172.16.0.1, 192.168.0.1' })
    expect(extractClientIp(h)).toBe('unknown')
  })

  test('returns unknown when no headers present', () => {
    expect(extractClientIp(makeHeaders({}))).toBe('unknown')
  })

  test('ignores private x-real-ip and falls back to x-forwarded-for', () => {
    const h = makeHeaders({ 'x-real-ip': '127.0.0.1', 'x-forwarded-for': '4.4.4.4' })
    expect(extractClientIp(h)).toBe('4.4.4.4')
  })

  test('handles single non-private x-forwarded-for entry', () => {
    const h = makeHeaders({ 'x-forwarded-for': '8.8.8.8' })
    expect(extractClientIp(h)).toBe('8.8.8.8')
  })

  test('strips whitespace around IPs', () => {
    const h = makeHeaders({ 'x-real-ip': '  5.5.5.5  ' })
    expect(extractClientIp(h)).toBe('5.5.5.5')
  })
})

// ─── validateKeywords ─────────────────────────────────────────────────────────

describe('validateKeywords', () => {
  test('accepts a single valid keyword', () => {
    const r = validateKeywords('디펜스')
    expect(r.valid).toBe(true)
    expect(r.keywords).toEqual(['디펜스'])
  })

  test('accepts multiple valid keywords', () => {
    const r = validateKeywords('디펜스,tower defense,전략')
    expect(r.valid).toBe(true)
    expect(r.keywords).toHaveLength(3)
  })

  test('trims whitespace around keywords', () => {
    const r = validateKeywords('  디펜스  ,  모바일  ')
    expect(r.valid).toBe(true)
    expect(r.keywords).toEqual(['디펜스', '모바일'])
  })

  test('rejects empty string', () => {
    expect(validateKeywords('').valid).toBe(false)
    expect(validateKeywords('').error).toBe('KEYWORD_REQUIRED')
  })

  test('rejects only-comma input', () => {
    expect(validateKeywords(',,,').valid).toBe(false)
  })

  test('rejects more than 5 keywords', () => {
    const r = validateKeywords('a,b,c,d,e,f')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/MAX_5/)
  })

  test('accepts exactly 5 keywords', () => {
    const r = validateKeywords('a,b,c,d,e')
    expect(r.valid).toBe(true)
    expect(r.keywords).toHaveLength(5)
  })

  test('rejects keyword exceeding 100 chars', () => {
    const r = validateKeywords('a'.repeat(101))
    expect(r.valid).toBe(false)
    expect(r.error).toBe('KEYWORD_TOO_LONG')
  })

  test('accepts keyword of exactly 100 chars', () => {
    const r = validateKeywords('a'.repeat(100))
    expect(r.valid).toBe(true)
  })

  test('rejects null byte injection', () => {
    const r = validateKeywords('valid\x00injection')
    expect(r.valid).toBe(false)
    expect(r.error).toBe('INVALID_KEYWORD_CHARS')
  })

  test('rejects ASCII control characters', () => {
    expect(validateKeywords('keyword\x1f').valid).toBe(false)
    expect(validateKeywords('keyword\x01').valid).toBe(false)
    expect(validateKeywords('keyword\x08').valid).toBe(false)
  })

  test('allows tab and newline (edge case — trimmed away anyway)', () => {
    // \x09 = tab, \x0a = LF — both are in the allowed range
    const r = validateKeywords('keyword')
    expect(r.valid).toBe(true)
  })
})

// ─── isBodyTooLarge ───────────────────────────────────────────────────────────

describe('isBodyTooLarge', () => {
  test('returns false when content-length is null', () => {
    expect(isBodyTooLarge(null, 1024)).toBe(false)
  })

  test('returns false when content-length is within limit', () => {
    expect(isBodyTooLarge('1000', 1024)).toBe(false)
  })

  test('returns false at exact limit', () => {
    expect(isBodyTooLarge('1024', 1024)).toBe(false)
  })

  test('returns true when content-length exceeds limit', () => {
    expect(isBodyTooLarge('1025', 1024)).toBe(true)
  })

  test('returns false for non-numeric content-length', () => {
    expect(isBodyTooLarge('abc', 1024)).toBe(false)
  })
})

// ─── safeCompareSecret ────────────────────────────────────────────────────────

describe('safeCompareSecret', () => {
  test('returns true for identical secrets', () => {
    expect(safeCompareSecret('supersecret123', 'supersecret123')).toBe(true)
  })

  test('returns false for different secrets', () => {
    expect(safeCompareSecret('supersecret123', 'wrongsecret')).toBe(false)
  })

  test('returns false when first argument is empty', () => {
    expect(safeCompareSecret('', 'secret')).toBe(false)
  })

  test('returns false when second argument is empty', () => {
    expect(safeCompareSecret('secret', '')).toBe(false)
  })

  test('returns false when both arguments are empty', () => {
    expect(safeCompareSecret('', '')).toBe(false)
  })

  test('is case-sensitive', () => {
    expect(safeCompareSecret('Secret', 'secret')).toBe(false)
  })

  test('handles long secrets correctly', () => {
    const long = 'x'.repeat(1000)
    expect(safeCompareSecret(long, long)).toBe(true)
    expect(safeCompareSecret(long, long + 'x')).toBe(false)
  })
})

// ─── isAllowedExternalUrl ────────────────────────────────────────────────────

describe('isAllowedExternalUrl', () => {
  // Allowlisted domains
  test('allows Anthropic API', () => {
    expect(isAllowedExternalUrl('https://api.anthropic.com/v1/messages')).toBe(true)
  })

  test('allows Meta Graph API', () => {
    expect(isAllowedExternalUrl('https://graph.facebook.com/v19.0/ads_archive')).toBe(true)
  })

  test('allows IGDB API', () => {
    expect(isAllowedExternalUrl('https://api.igdb.com/v4/release_dates')).toBe(true)
  })

  test('allows Twitch OAuth', () => {
    expect(isAllowedExternalUrl('https://id.twitch.tv/oauth2/token')).toBe(true)
  })

  test('allows Slack webhook', () => {
    expect(isAllowedExternalUrl('https://hooks.slack.com/services/ABC/DEF/xyz')).toBe(true)
  })

  test('allows gamemeca', () => {
    expect(isAllowedExternalUrl('https://www.gamemeca.com/rss.php')).toBe(true)
  })

  // Protocol checks
  test('rejects HTTP (non-HTTPS)', () => {
    expect(isAllowedExternalUrl('http://api.anthropic.com/v1/messages')).toBe(false)
  })

  test('rejects unknown domain', () => {
    expect(isAllowedExternalUrl('https://evil.com/steal')).toBe(false)
  })

  test('rejects invalid URL', () => {
    expect(isAllowedExternalUrl('not-a-url')).toBe(false)
    expect(isAllowedExternalUrl('')).toBe(false)
  })

  // SSRF: private IP ranges
  test('blocks localhost SSRF', () => {
    expect(isAllowedExternalUrl('https://localhost/api/secret')).toBe(false)
    expect(isAllowedExternalUrl('https://localhost:3000/api/admin')).toBe(false)
  })

  test('blocks loopback IP SSRF', () => {
    expect(isAllowedExternalUrl('https://127.0.0.1/admin')).toBe(false)
  })

  test('blocks RFC 1918 private range 10.x.x.x', () => {
    expect(isAllowedExternalUrl('https://10.0.0.1/metadata')).toBe(false)
  })

  test('blocks RFC 1918 private range 192.168.x.x', () => {
    expect(isAllowedExternalUrl('https://192.168.1.1/admin')).toBe(false)
  })

  test('blocks RFC 1918 private range 172.16–31.x.x', () => {
    expect(isAllowedExternalUrl('https://172.16.0.1/admin')).toBe(false)
    expect(isAllowedExternalUrl('https://172.31.255.255/admin')).toBe(false)
  })

  test('blocks AWS/cloud metadata endpoint', () => {
    expect(isAllowedExternalUrl('https://169.254.169.254/latest/meta-data')).toBe(false)
  })

  test('blocks CGNAT range', () => {
    expect(isAllowedExternalUrl('https://100.64.0.1/internal')).toBe(false)
  })
})

// ─── createRateLimiter ────────────────────────────────────────────────────────

describe('createRateLimiter', () => {
  test('allows requests within limit', () => {
    let now = 0
    const limiter = createRateLimiter(60_000, 5, () => now)
    for (let i = 0; i < 5; i++) {
      expect(limiter.check('user1').allowed).toBe(true)
    }
  })

  test('blocks the request that exceeds the limit', () => {
    let now = 0
    const limiter = createRateLimiter(60_000, 5, () => now)
    for (let i = 0; i < 5; i++) limiter.check('user1')
    expect(limiter.check('user1').allowed).toBe(false)
  })

  test('resets after the window expires', () => {
    let now = 0
    const limiter = createRateLimiter(60_000, 2, () => now)
    limiter.check('user1')
    limiter.check('user1')
    expect(limiter.check('user1').allowed).toBe(false)

    now = 60_001 // advance past window
    expect(limiter.check('user1').allowed).toBe(true)
  })

  test('tracks keys independently', () => {
    let now = 0
    const limiter = createRateLimiter(60_000, 1, () => now)
    limiter.check('user1')
    expect(limiter.check('user1').allowed).toBe(false)
    expect(limiter.check('user2').allowed).toBe(true)
  })

  test('remaining count decrements correctly', () => {
    let now = 0
    const limiter = createRateLimiter(60_000, 3, () => now)
    expect(limiter.check('k').remaining).toBe(2)
    expect(limiter.check('k').remaining).toBe(1)
    expect(limiter.check('k').remaining).toBe(0)
    expect(limiter.check('k').remaining).toBe(0) // blocked
  })

  test('remaining is 0 when blocked', () => {
    let now = 0
    const limiter = createRateLimiter(60_000, 1, () => now)
    limiter.check('k')
    const result = limiter.check('k')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  test('provides correct resetAt timestamp', () => {
    let now = 1000
    const limiter = createRateLimiter(60_000, 5, () => now)
    const result = limiter.check('k')
    expect(result.resetAt).toBe(61_000) // now + windowMs
  })

  test('max=1 allows exactly one request per window', () => {
    let now = 0
    const limiter = createRateLimiter(1_000, 1, () => now)
    expect(limiter.check('k').allowed).toBe(true)
    expect(limiter.check('k').allowed).toBe(false)
    now = 1_001
    expect(limiter.check('k').allowed).toBe(true)
  })
})

// ─── validateSelfCallBaseUrl ─────────────────────────────────────────────────

describe('validateSelfCallBaseUrl', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true })
  })

  test('allows a valid HTTPS production URL', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })
    expect(validateSelfCallBaseUrl('https://myapp.vercel.app')).toBe(true)
  })

  test('rejects HTTP in production', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })
    expect(validateSelfCallBaseUrl('http://myapp.vercel.app')).toBe(false)
  })

  test('allows localhost in development', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
    expect(validateSelfCallBaseUrl('http://localhost:3000')).toBe(true)
  })

  test('rejects localhost in production', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })
    expect(validateSelfCallBaseUrl('http://localhost:3000')).toBe(false)
  })

  test('rejects invalid URL', () => {
    expect(validateSelfCallBaseUrl('not-a-url')).toBe(false)
  })

  test('rejects private IP ranges', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })
    expect(validateSelfCallBaseUrl('https://192.168.1.1')).toBe(false)
    expect(validateSelfCallBaseUrl('https://10.0.0.1')).toBe(false)
  })
})
