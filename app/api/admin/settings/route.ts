import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await admin()
    .from('chat_settings')
    .select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Return as key→value map
  const map: Record<string, unknown> = {}
  for (const row of data || []) map[row.key] = row.value
  return NextResponse.json(map)
}

export async function POST(req: Request) {
  const body = await req.json() as Record<string, unknown>
  const supabase = admin()
  const results = await Promise.all(
    Object.entries(body).map(([key, value]) =>
      supabase.from('chat_settings').upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
    )
  )
  const err = results.find(r => r.error)
  if (err?.error) return NextResponse.json({ error: err.error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
