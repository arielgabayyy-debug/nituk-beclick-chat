import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl" className="dark bg-background">
      <body className={`${heebo.className} font-sans antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
