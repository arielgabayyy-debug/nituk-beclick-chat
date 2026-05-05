import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminRequest } from '@/lib/admin-auth'

const VALID_STATUSES = new Set(['pending', 'resolved', 'dismissed'])
const VALID_RESOLVE_STATUSES = new Set(['resolved', 'dismissed'])

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  // Server-side admin verification (defense in depth beyond middleware)
  const auth = await verifyAdminRequest(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'

  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
  }

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
  // Server-side admin verification (defense in depth beyond middleware)
  const auth = await verifyAdminRequest(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { id, status, admin_note } = body as {
    id?: unknown; status?: unknown; admin_note?: unknown
  }

  // Validate id
  if (!id || typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 })
  }
  // Validate status
  if (!status || typeof status !== 'string' || !VALID_RESOLVE_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Status must be resolved or dismissed' }, { status: 400 })
  }
  // Validate admin_note length
  if (admin_note !== undefined && admin_note !== null) {
    if (typeof admin_note !== 'string' || admin_note.length > 1000) {
      return NextResponse.json({ error: 'Admin note too long' }, { status: 400 })
    }
  }

  const supabase = admin()
  const { error } = await supabase
    .from('message_reports')
    .update({
      status,
      admin_note: typeof admin_note === 'string' ? admin_note : null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  try {
    await supabase.from('admin_audit_log').insert({
      action: `report_${status}`,
      target_id: id,
      target_type: 'report',
      details: { admin_email: auth.email, admin_note: admin_note || null },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
