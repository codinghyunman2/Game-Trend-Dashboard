/** @type {import('next').NextConfig} */

// ─── Security Headers ─────────────────────────────────────────────────────────
// NOTE: Content-Security-Policy is NOT set here.
// CSP requires a per-request nonce to cover Next.js App Router streaming scripts
// (self.__next_f.push(...)). It is generated in middleware.ts and injected as a
// response header there. Static hash-based CSP breaks App Router streaming.

const securityHeaders = [
  // Prevent browsers from inferring content type (XSS vector)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Clickjacking protection (redundant with frame-ancestors CSP but defence-in-depth)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Disable DNS pre-fetching to reduce information leakage
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // HSTS: 2 years, include subdomains, preload-eligible
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Don't send full Referer to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features the app doesn't use
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
]

const nextConfig = {
  // Remove "X-Powered-By: Next.js" response header
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
