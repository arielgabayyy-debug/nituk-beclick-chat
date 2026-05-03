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
          // מאפשר הטמעה ב-iframe מאתר nitukbeclick.co.il
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://nitukbeclick.co.il',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://nitukbeclick.co.il https://*.nitukbeclick.co.il",
          },
        ],
      },
    ]
  },
}

export default nextConfig
