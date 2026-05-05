import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminRequest } from '@/lib/admin-auth'

const ALLOWED_SETTING_KEYS = new Set([
  'slow_mode',
  'banned_words',
  'maintenance_mode',
  'welcome_message',
  'registration',
])

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  // Server-side admin verification (defense in depth beyond middleware)
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data, error } = await admin()
    .from('chat_settings')
    .select('*')
  if (error) { console.error('[settings/get]', error); return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 }) }
  // Return as key→value map
  const map: Record<string, unknown> = {}
  for (const row of data || []) map[row.key] = row.value
  return NextResponse.json(map)
}

export async function POST(req: Request) {
  // Server-side admin verification (defense in depth beyond middleware)
  const auth = await verifyAdminRequest(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 })
  }

  const entries = Object.entries(body as Record<string, unknown>)

  // Validate all keys are in the allowed list
  for (const [key] of entries) {
    if (!ALLOWED_SETTING_KEYS.has(key)) {
      return NextResponse.json({ error: `Invalid setting key: ${key}` }, { status: 400 })
    }
  }

  // Max 5 settings per request
  if (entries.length > 5) {
    return NextResponse.json({ error: 'Too many settings in one request' }, { status: 400 })
  }

  const supabase = admin()
  const results = await Promise.all(
    entries.map(([key, value]) =>
      supabase.from('chat_settings').upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
    )
  )
  const err = results.find(r => r.error)
  if (err?.error) { console.error('[settings/post]', err.error); return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 }) }

  // Audit log: record what was changed and by whom
  const changedKeys = entries.map(([k]) => k)
  try {
    await supabase.from('admin_audit_log').insert({
      action: 'update_settings',
      target_type: 'settings',
      details: { changed_keys: changedKeys, admin_email: auth.email },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
