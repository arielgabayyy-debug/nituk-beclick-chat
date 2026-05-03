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
          // Allow iframe embedding from nitukbeclick.co.il
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://nitukbeclick.co.il',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://nitukbeclick.co.il https://*.nitukbeclick.co.il",
          },
          // Allow microphone/camera access even when embedded in an iframe
          {
            key: 'Permissions-Policy',
            value: 'microphone=*, camera=*, autoplay=*',
          },
        ],
      },
    ]
  },
}

export default nextConfig
