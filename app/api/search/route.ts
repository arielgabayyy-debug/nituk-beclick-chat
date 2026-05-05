import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Simple per-IP rate limiter (30 req / 60s)
const rateLimitMap = new Map<string, { count: number; reset: number }>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 60_000 })
    return true
  }
  if (entry.count >= 30) return false
  entry.count++
  return true
}

export async function GET(request: NextRequest) {
  // 1. Rate limit
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // 2. Auth — require a valid Supabase session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 3. Parse and validate params
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  const userId = searchParams.get('user_id')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

  if (q.length < 2) return NextResponse.json({ results: [] })

  // Escape ILIKE special chars to prevent injection
  const safeQ = q.replace(/[%_\\]/g, '\\$&').slice(0, 100)

  try {
    let query = supabase
      .from('chat_messages')          // ← fixed: was 'messages' (wrong table)
      .select(`
        id, content, created_at, user_id, is_pinned, has_gif, gif_url,
        user:chat_users!inner(id, name, avatar_color, user_type)
      `)
      .ilike('content', `%${safeQ}%`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (userId) query = query.eq('user_id', userId)

    const { data, error } = await query
    if (error) {
      console.error('[search]', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    const results = (data || []).map(m => ({
      id: m.id,
      content: m.content,
      created_at: m.created_at,
      user_id: m.user_id,
      is_pinned: m.is_pinned,
      has_gif: m.has_gif,
      user: m.user,
    }))

    return NextResponse.json(
      { results, total: results.length },
      { headers: { 'Cache-Control': 'private, max-age=10' } }
    )
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
