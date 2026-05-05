import type { Metadata, Viewport } from 'next'
import { Heebo } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import './globals.css'

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-heebo"
})

export const metadata: Metadata = {
  title: 'צ׳אט קהילתי | ניתוק בקליק',
  description: 'הצטרפו לקהילה הגדולה בישראל להשוואת מחירי סלולר ואינטרנט',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ניתוק בקליק',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#06b6d4',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // suppressHydrationWarning: the theme-init script adds class="dark" before React
    // hydrates, which would otherwise cause a server/client mismatch warning.
    <html lang="he" dir="rtl" className="bg-background" suppressHydrationWarning>
      <head />
      <body className={`${heebo.className} font-sans antialiased`}>
        {/* Apply saved theme before first paint to avoid flash.
            Must be outside <head> in App Router — Next.js injects it correctly. */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `(function(){var s=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(!s&&d)){document.documentElement.classList.add('dark');}})();` }}
        />
        {children}
        {/* Service Worker registration — runs after page is interactive */}
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(e){console.warn('SW registration failed:',e);});}` }}
        />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
