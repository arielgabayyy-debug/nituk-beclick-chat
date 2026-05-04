import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'

  const { data, error } = await admin()
    .from('message_reports')
    .select(`
      id, reason, status, admin_note, created_at, resolved_at,
      message:chat_messages(id, content, created_at, user:chat_users(name)),
      reporter:chat_users(name, email)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reports: data })
}

export async function PATCH(req: Request) {
  const { id, status, admin_note } = await req.json() as {
    id: string; status: 'resolved' | 'dismissed'; admin_note?: string
  }
  const { error } = await admin()
    .from('message_reports')
    .update({
      status,
      admin_note: admin_note || null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
