/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "media-src 'self' blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://api.brevo.com https://vercel.live",
              "worker-src 'self' blob:",
            ].join('; '),
          },
          // ── Permissions: only the specific origins that need mic/camera ──
          {
            key: 'Permissions-Policy',
            value: [
              'microphone=(self "https://nitukbeclick.co.il")',
              'camera=(self "https://nitukbeclick.co.il")',
              'autoplay=(self)',
              'geolocation=()',
              'payment=()',
              'usb=()',
            ].join(', '),
          },
          // ── Standard security headers ────────────────────────────────────
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      // API routes: no caching, extra protection
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

export default nextConfig
