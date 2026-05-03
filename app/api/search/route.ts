import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const userId = searchParams.get('user_id')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    let query = supabase
      .from('messages')
      .select('id, content, created_at, user_id, is_pinned, has_gif, gif_url, chat_users!inner(id, name, avatar_color, user_type)')
      .ilike('content', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const results = (data || []).map((m: Record<string, unknown>) => ({
      id: m.id,
      content: m.content,
      created_at: m.created_at,
      user_id: m.user_id,
      is_pinned: m.is_pinned,
      has_gif: m.has_gif,
      user: m.chat_users,
    }))

    return NextResponse.json({ results, total: results.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
