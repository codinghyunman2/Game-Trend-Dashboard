/**
 * middleware.ts — Edge middleware
 *
 * Responsibilities:
 *  - CSP: generate a per-request nonce and inject it into the Content-Security-Policy
 *    response header. The nonce is also forwarded to Server Components via x-nonce
 *    request header so layout.tsx can stamp inline scripts.
 *  - CORS: allow same-origin browser requests; block unknown cross-origin requests
 *  - Preflight (OPTIONS): respond 204 with CORS headers
 *
 * NOTE: Static security headers (HSTS, X-Frame-Options, etc.) remain in
 * next.config.js. Only CSP is handled here because it requires a per-request nonce.
 */

import { NextRequest, NextResponse } from 'next/server'

// Origins explicitly allowed in addition to same-origin.
// Set ALLOWED_ORIGINS=https://foo.com,https://bar.com in env if needed.
const EXTRA_ALLOWED_ORIGINS: Set<string> = new Set(
  (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
)

function getExpectedOrigin(request: NextRequest): string {
  // The Host header is set by the edge; clients cannot reliably forge it.
  const host = request.headers.get('host') ?? ''
  // Infer protocol: Vercel always terminates TLS, so use https in production.
  const proto =
    process.env.NODE_ENV === 'development' ? 'http' : 'https'
  return `${proto}://${host}`
}

function isAllowedOrigin(origin: string, expectedOrigin: string): boolean {
  if (origin === expectedOrigin) return true
  if (EXTRA_ALLOWED_ORIGINS.has(origin)) return true
  return false
}

function setCorsHeaders(headers: Headers, origin: string): void {
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Max-Age', '86400')
  headers.set('Vary', 'Origin')
}

function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  return [
    "default-src 'self'",
    // nonce covers both our inline script and Next.js App Router streaming scripts
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' data: https://images.igdb.com https://www.gamemeca.com https://i.ytimg.com",
    "font-src 'self' https://cdn.jsdelivr.net",
    "connect-src 'self' https://cdn.jsdelivr.net",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ')
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const { method } = request

  const nonce = generateNonce()
  const csp = buildCsp(nonce)

  // ── API routes: CORS + nonce ───────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')

    // Preflight
    if (method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 })
      if (origin) {
        const expected = getExpectedOrigin(request)
        if (isAllowedOrigin(origin, expected)) {
          setCorsHeaders(response.headers, origin)
        }
      }
      response.headers.set('Content-Security-Policy', csp)
      return response
    }

    // Cross-origin check (server-to-server requests have no Origin — always pass)
    if (origin) {
      const expected = getExpectedOrigin(request)
      if (!isAllowedOrigin(origin, expected)) {
        return NextResponse.json(
          { error: 'FORBIDDEN', message: '허용되지 않은 출처입니다.' },
          { status: 403 },
        )
      }
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-nonce', nonce)
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    if (origin) {
      setCorsHeaders(response.headers, origin)
    }
    response.headers.set('Content-Security-Policy', csp)
    return response
  }

  // ── Page routes: forward nonce to Server Components ───────────────────────
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  // Run on all routes except static assets and images
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
