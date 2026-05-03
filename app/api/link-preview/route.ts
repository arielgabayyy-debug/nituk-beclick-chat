import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  // Validate URL
  try { new URL(url) } catch { return NextResponse.json({ error: 'Invalid url' }, { status: 400 }) }

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

    return NextResponse.json({ title, description, image, siteName, url })
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 400 })
  }
}
