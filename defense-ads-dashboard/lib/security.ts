/**
 * security.ts — Shared security utilities
 *
 * Design notes:
 * - No next/server imports: keeps this module testable without Next.js mocks
 * - Rate limiter is in-process. In multi-instance / serverless deployments the
 *   limit is per-instance, not global. Use Redis for global enforcement.
 * - Secret comparison is constant-time (prevents timing attacks).
 */

import { timingSafeEqual, createHash } from 'crypto'

// ─── IP Extraction ────────────────────────────────────────────────────────────

// RFC 1918 private ranges + loopback + link-local + CGNAT + IPv6 private
const PRIVATE_IP_RE =
  /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.0\.0\.0|100\.64\.|::1$|fc[0-9a-f]{2}:|fe[89ab][0-9a-f]:)/i

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RE.test(ip.trim())
}

/**
 * Extract the real client IP from request headers.
 *
 * Priority:
 *  1. x-real-ip   — set by Vercel edge / trusted reverse proxies
 *  2. Rightmost non-private IP in x-forwarded-for
 *     (rightmost = added by the last trusted proxy; leftmost can be spoofed)
 *  3. 'unknown'
 */
export function extractClientIp(headers: { get(name: string): string | null }): string {
  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp && !isPrivateIp(realIp)) return realIp

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const ips = forwarded.split(',').map((s) => s.trim()).filter(Boolean)
    // Iterate right-to-left: leftmost is client-controlled and can be forged
    for (let i = ips.length - 1; i >= 0; i--) {
      const candidate = ips[i]
      if (candidate && !isPrivateIp(candidate)) return candidate
    }
  }

  return 'unknown'
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Create a per-key sliding-window rate limiter.
 *
 * @param windowMs   Window duration in milliseconds
 * @param max        Max requests per window
 * @param _getClock  Optional clock function (injectable for testing)
 */
export function createRateLimiter(
  windowMs: number,
  max: number,
  /** @internal For testing only */
  _getClock?: () => number,
) {
  const clock = _getClock ?? (() => Date.now())
  const store = new Map<string, RateLimitEntry>()
  let lastCleanup = 0

  function cleanup(now: number): void {
    // Only run cleanup once per window to amortize cost
    if (now - lastCleanup < windowMs) return
    lastCleanup = now
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
  }

  return {
    check(key: string): RateLimitResult {
      const now = clock()
      cleanup(now)

      const entry = store.get(key)
      if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true, remaining: max - 1, resetAt: now + windowMs }
      }

      if (entry.count >= max) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt }
      }

      entry.count++
      return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt }
    },
  }
}

// ─── Input Validation ─────────────────────────────────────────────────────────

const MAX_KEYWORDS = 5
const MAX_KEYWORD_LEN = 100

export interface KeywordValidationResult {
  valid: boolean
  error?: string
  keywords?: string[]
}

/**
 * Validate and sanitize a comma-separated keyword string from URL params.
 * Blocks null bytes, ASCII control characters, and oversized inputs.
 */
export function validateKeywords(raw: string): KeywordValidationResult {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, error: 'KEYWORD_REQUIRED' }
  }

  const keywords = raw.split(',').map((k) => k.trim()).filter(Boolean)

  if (keywords.length === 0) {
    return { valid: false, error: 'KEYWORD_REQUIRED' }
  }
  if (keywords.length > MAX_KEYWORDS) {
    return { valid: false, error: `MAX_${MAX_KEYWORDS}_KEYWORDS_ALLOWED` }
  }

  for (const kw of keywords) {
    if (kw.length > MAX_KEYWORD_LEN) {
      return { valid: false, error: 'KEYWORD_TOO_LONG' }
    }
    // Block null bytes and ASCII control characters (tab \x09, LF \x0a are allowed)
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x08\x0b-\x1f\x7f]/.test(kw)) {
      return { valid: false, error: 'INVALID_KEYWORD_CHARS' }
    }
  }

  return { valid: true, keywords }
}

// ─── Body Size ────────────────────────────────────────────────────────────────

/**
 * Returns true when the Content-Length header exceeds maxBytes.
 * Safe to call even when Content-Length is absent (returns false).
 */
export function isBodyTooLarge(contentLength: string | null, maxBytes: number): boolean {
  if (!contentLength) return false
  const size = parseInt(contentLength, 10)
  return !isNaN(size) && size > maxBytes
}

// ─── Constant-time Secret Comparison ─────────────────────────────────────────

/**
 * Compare two secrets in constant time to prevent timing-based attacks.
 * Hashes both sides with SHA-256 first to normalise length before comparison.
 */
export function safeCompareSecret(a: string, b: string): boolean {
  if (!a || !b) return false
  try {
    const ha = createHash('sha256').update(a).digest()
    const hb = createHash('sha256').update(b).digest()
    return timingSafeEqual(ha, hb)
  } catch {
    return false
  }
}

// ─── SSRF Protection ──────────────────────────────────────────────────────────

// Patterns that must never be fetched (private/reserved address spaces)
const SSRF_BLOCKED_RE: RegExp[] = [
  /^https?:\/\/localhost(?::\d+)?(?:\/|$)/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\.0\.0\.0/,
  /^https?:\/\/169\.254\./,        // Cloud metadata (AWS/GCP/Azure)
  /^https?:\/\/100\.64\./,         // CGNAT shared space
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/\[::1\]/i,          // IPv6 loopback
  /^https?:\/\/\[fc/i,             // IPv6 unique-local
  /^https?:\/\/\[fe[89ab]/i,       // IPv6 link-local
]

/**
 * Allowlist of external domains this application is permitted to call.
 * Any domain NOT in this set will be rejected by isAllowedExternalUrl().
 */
const ALLOWED_EXTERNAL_HOSTS = new Set([
  // AI / Ads APIs
  'api.anthropic.com',
  'graph.facebook.com',
  // IGDB / Twitch
  'api.igdb.com',
  'id.twitch.tv',
  // Game news sources
  'www.gamemeca.com',
  'game.donga.com',
  'bbs.ruliweb.com',
  'www.gameshot.net',
  'www.gamesindustry.biz',
  'www.videogameschronicle.com',
  'www.gamedeveloper.com',
  'naavik.co',
  'mobilegamer.biz',
  'toucharcade.com',
  'www.pocketgamer.com',
  'www.pocketgamer.biz',
  'gamingonphone.com',
  // Slack notifications
  'hooks.slack.com',
])

/**
 * Returns true only if the URL:
 *  1. uses HTTPS
 *  2. does not target a private/reserved address
 *  3. hostname is in the application allowlist
 */
export function isAllowedExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    if (SSRF_BLOCKED_RE.some((re) => re.test(url))) return false
    return ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname)
  } catch {
    return false
  }
}

/**
 * Validate a base URL used for internal self-calls (e.g. slack/briefing → /api/*).
 * Prevents SSRF via a misconfigured SITE_URL environment variable.
 */
export function validateSelfCallBaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // In production only HTTPS is acceptable
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') return false
    // Block SSRF to private ranges (localhost is allowed in development)
    if (SSRF_BLOCKED_RE.some((re) => re.test(url))) {
      // Allow localhost only in development
      return process.env.NODE_ENV !== 'production'
    }
    return true
  } catch {
    return false
  }
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export type AuditEventType =
  | 'RATE_LIMIT'
  | 'AUTH_FAILURE'
  | 'VALIDATION_FAILURE'
  | 'CRON_AUTH_SUCCESS'
  | 'SUSPICIOUS_INPUT'

/**
 * Emit a structured audit log entry.
 * Suppressed in the test environment to keep test output clean.
 * In production wire this to your observability pipeline.
 */
export function auditLog(
  type: AuditEventType,
  ip: string,
  path: string,
  detail?: string,
): void {
  if (process.env.NODE_ENV === 'test') return
  const entry = {
    t: new Date().toISOString(),
    type,
    ip,
    path,
    ...(detail ? { detail } : {}),
  }
  console.warn('[AUDIT]', JSON.stringify(entry))
}
