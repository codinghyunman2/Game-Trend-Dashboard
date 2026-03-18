/**
 * middleware.ts — Edge middleware
 *
 * Responsibilities:
 *  - CORS: allow same-origin browser requests; block unknown cross-origin requests
 *  - Preflight (OPTIONS): respond 204 with CORS headers
 *
 * NOTE: Security headers (CSP, HSTS, etc.) are set in next.config.js so they
 * apply to every response without needing runtime logic here.
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

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const { method } = request

  // Only process API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const origin = request.headers.get('origin')

  // ── Preflight ─────────────────────────────────────────────────────────────
  if (method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })
    if (origin) {
      const expected = getExpectedOrigin(request)
      if (isAllowedOrigin(origin, expected)) {
        setCorsHeaders(response.headers, origin)
      }
    }
    return response
  }

  // ── Cross-origin check ────────────────────────────────────────────────────
  // Requests WITHOUT an Origin header are server-to-server (Vercel Cron,
  // internal self-calls from slack/briefing, etc.) — always allowed.
  if (origin) {
    const expected = getExpectedOrigin(request)
    if (!isAllowedOrigin(origin, expected)) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '허용되지 않은 출처입니다.' },
        { status: 403 },
      )
    }
  }

  // ── Pass-through with CORS headers ────────────────────────────────────────
  const response = NextResponse.next()
  if (origin) {
    setCorsHeaders(response.headers, origin)
  }
  return response
}

export const config = {
  matcher: '/api/:path*',
}
