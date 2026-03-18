/** @type {import('next').NextConfig} */

// ─── Content Security Policy ──────────────────────────────────────────────────
// Notes:
//  - script-src 'unsafe-inline': required because layout.tsx contains an inline
//    dark-mode script. For stricter CSP, replace with a nonce injected via middleware.
//  - style-src 'unsafe-inline': Tailwind CSS injects inline styles.
//  - img-src includes IGDB cover images and gamemeca thumbnails.
//  - connect-src 'self': all API calls go to the same origin (server-side only).
//  - upgrade-insecure-requests: automatically upgrades HTTP sub-resources to HTTPS.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://images.igdb.com https://www.gamemeca.com",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ')

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
  // Content Security Policy
  { key: 'Content-Security-Policy', value: csp },
  // Remove the X-Powered-By header that reveals Next.js (also set poweredByHeader: false)
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
