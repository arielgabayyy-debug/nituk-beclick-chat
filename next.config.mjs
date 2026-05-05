/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },

  // ── Compression: gzip/brotli all responses ───────────────────────────────
  compress: true,

  // ── Bundle size: tree-shake large icon/UI libraries ──────────────────────
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
      'date-fns',
      'recharts',
    ],
  },

  // Webpack: split vendor libs and heavy packages into separate named chunks
  webpack(config, { isServer }) {
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Supabase in its own chunk (loaded on all screens)
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 30,
          },
          // Recharts in its own chunk (admin only)
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: 'recharts',
            chunks: 'async',
            priority: 25,
          },
          // Radix UI components split out
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix',
            chunks: 'async',
            priority: 20,
          },
          // Everything else in node_modules
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'async',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      }
    }
    return config
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
      // API routes: never cache by default (mutations, auth-sensitive data)
      // NOTE: individual read-only routes (link-preview, translate, gifs) set their
      //       own Cache-Control headers which take precedence over this rule.
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      // Read-only, public, cacheable API routes — override the no-store above
      {
        source: '/api/link-preview',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/api/translate',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/api/gifs',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=600' },
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
        source: '/(.*)\\.(ico|png|jpg|jpeg|webp|avif|svg|woff2|woff|mp3|m4a|mp4|webm|ogg|wav|mov|aac)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ]
  },
}

export default nextConfig
