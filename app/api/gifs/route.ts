import { NextResponse } from 'next/server'

export const runtime = 'edge'

// Tenor API key — server-side only, never exposed in the browser bundle
const TENOR_KEY = process.env.TENOR_API_KEY || 'AIzaSyAyimkuEcduhV3QIZmCYkMPBSmBpCy27as'
const CLIENT_KEY = 'nitukbeclick_chat'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q        = searchParams.get('q')         || ''
  const type     = searchParams.get('type')       || 'search'   // 'search' | 'featured'
  const locale   = searchParams.get('locale')     || 'he_IL'
  const limit    = Math.min(parseInt(searchParams.get('limit') || '16'), 30)

  const params = new URLSearchParams({
    key:           TENOR_KEY,
    client_key:    CLIENT_KEY,
    limit:         String(limit),
    media_filter:  'tinygif,gif,mediumgif',
    contentfilter: 'low',
    locale,
  })

  if (q)         params.set('q', q)
  if (type === 'featured' || !q) params.delete('q')

  const endpoint = (type === 'featured' || !q) ? 'featured' : 'search'

  try {
    const res = await fetch(
      `https://tenor.googleapis.com/v2/${endpoint}?${params}`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) {
      return NextResponse.json({ results: [] }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': q
          ? 'public, max-age=300, stale-while-revalidate=600'   // search: 5 min cache
          : 'public, max-age=120, stale-while-revalidate=300',  // trending: 2 min cache
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return NextResponse.json({ results: [], error: 'Tenor unavailable' }, { status: 503 })
  }
}
