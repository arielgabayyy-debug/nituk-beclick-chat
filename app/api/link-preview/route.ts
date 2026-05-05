import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimitDB } from '@/lib/rate-limit-db'

// Block SSRF — deny requests to private/internal IP ranges
function isPrivateUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr)
    const hostname = parsed.hostname
    // Block localhost, private IP ranges, and metadata services
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('192.168.') ||
      hostname === '169.254.169.254' || // AWS metadata
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) return true
    return false
  } catch { return true }
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await checkRateLimitDB(ip, 'link-preview', 60, 60)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  if (url.length > 2048) return NextResponse.json({ error: 'URL too long' }, { status: 400 })

  // Validate URL — must be http/https only
  let parsed: URL
  try {
    parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
    }
  } catch { return NextResponse.json({ error: 'Invalid url' }, { status: 400 }) }

  // Block SSRF attacks
  if (isPrivateUrl(url)) {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  // Skip image/audio/video direct links
  if (/\.(jpg|jpeg|png|gif|webp|svg|mp4|mp3|webm|pdf)(\?.*)?$/i.test(url)) {
    return NextResponse.json({ error: 'media' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return NextResponse.json({ error: 'fetch failed' }, { status: 400 })

    const html = await res.text()

    const getMeta = (prop: string): string => {
      // og: and name= variants
      const patterns = [
        new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'),
        new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`, 'i'),
      ]
      for (const p of patterns) {
        const m = html.match(p)
        if (m?.[1]) return m[1].trim()
      }
      return ''
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = getMeta('title') || titleMatch?.[1]?.trim() || ''
    const description = getMeta('description') || ''
    const image = getMeta('image') || ''
    const siteName = getMeta('site_name') || new URL(url).hostname

    return NextResponse.json(
      { title, description, image, siteName, url },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
    )
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 400 })
  }
}
