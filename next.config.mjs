/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },

  // ── Compression: gzip/brotli all responses ───────────────────────────────
  compress: true,

  // ── Bundle size: tree-shake large icon/UI libraries ──────────────────────
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-avatar',
      'date-fns',
    ],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,   // 24h CDN cache for optimized images
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: 'media.tenor.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // ── Framing: allow only from nitukbeclick.co.il ──────────────────
          // X-Frame-Options is deprecated; CSP frame-ancestors is the modern standard
          {
            key: 'Content-Security-Policy',
            value: [
              "frame-ancestors 'self' https://nitukbeclick.co.il https://www.nitukbeclick.co.il",
              "default-src 'self'",
              // unsafe-eval removed — Next.js 16 + Turbopack doesn't need it in production
              "script-src 'self' 'unsafe-inline' https://vercel.live https://ss.supabase.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: http:",
              "media-src 'self' blob: https: data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in wss://*.supabase.in https://api.resend.com https://api.brevo.com https://vercel.live https://tenor.googleapis.com https://api.mymemory.translated.net https://libretranslate.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // ── Permissions-Policy ───────────────────────────────────────────
          {
            key: 'Permissions-Policy',
            value: [
              'microphone=(self "https://nitukbeclick.co.il" "https://www.nitukbeclick.co.il")',
              'camera=(self "https://nitukbeclick.co.il" "https://www.nitukbeclick.co.il")',
              'display-capture=(self)',
              'autoplay=(self "https://nitukbeclick.co.il" "https://www.nitukbeclick.co.il")',
              'fullscreen=(self "https://nitukbeclick.co.il" "https://www.nitukbeclick.co.il")',
              'geolocation=()',
              'payment=()',
              'usb=()',
            ].join(', '),
          },
          // ── Standard security headers ────────────────────────────────────
          { key: 'X-DNS-Prefetch-Control',      value: 'on' },
          { key: 'X-Content-Type-Options',       value: 'nosniff' },
          { key: 'X-XSS-Protection',             value: '1; mode=block' },
          { key: 'X-Frame-Options',              value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security',    value: 'max-age=63072000; includeSubDomains; preload' },
          // Cross-Origin isolation — hardens against Spectre/side-channel attacks
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          // Don't send referrer to 3rd-party origins
          { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },
        ],
      },
      // API routes: never cache
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      // Static JS/CSS bundles: immutable (hash in filename → safe to cache forever)
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Public static files: 7-day cache
      {
        source: '/(.*)\\.(ico|png|jpg|jpeg|webp|avif|svg|woff2|woff|mp3)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ]
  },
}

export default nextConfig
