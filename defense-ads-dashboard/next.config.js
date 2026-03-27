/** @type {import('next').NextConfig} */

// ─── Content Security Policy ──────────────────────────────────────────────────
// Notes:
//  - script-src uses a sha256 hash for the dark-mode inline script in layout.tsx.
//    If the script content changes, recompute:
//    echo -n '<script>' | openssl dgst -sha256 -binary | base64
//  - style-src 'unsafe-inline': Tailwind CSS injects inline styles.
//  - img-src includes IGDB cover images and gamemeca thumbnails.
//  - connect-src 'self': all API calls go to the same origin (server-side only).
//  - upgrade-insecure-requests: automatically upgrades HTTP sub-resources to HTTPS.
const isDev = process.env.NODE_ENV === 'development'

// SHA-256 hash of the dark-mode detection inline script in app/layout.tsx:
// try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}
const THEME_SCRIPT_HASH = "'sha256-CJnJ7ixxoN4thKRNKpc5DhrbKAYQ0NWnojZKbW6iUSE='"

// SHA-256 hash of a Next.js App Router internal inline script (hydration/routing)
const NEXTJS_INTERNAL_HASH = "'sha256-IYQwQlCS7tlDdfed8qCp+uGm3rBPumW7jftgB2PJ+k0='"

const csp = [
  "default-src 'self'",
  `script-src 'self' ${THEME_SCRIPT_HASH} ${NEXTJS_INTERNAL_HASH}${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ''}`,
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
