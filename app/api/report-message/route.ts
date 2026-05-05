import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

// Module-level service-role singleton — avoids creating a new client on every request
let _serviceClient: ReturnType<typeof createClient> | null = null
function getServiceClient() {
  if (!_serviceClient) {
    _serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _serviceClient
}

// Per-IP rate limit: 5 reports / 60s (prevent spam reports)
const reportRateMap = new Map<string, { count: number; reset: number }>()
function checkReportRate(ip: string): boolean {
  const now = Date.now()
  const entry = reportRateMap.get(ip)
  if (!entry || now > entry.reset) { reportRateMap.set(ip, { count: 1, reset: now + 60_000 }); return true }
  if (entry.count >= 5) return false
  entry.count++; return true
}

const VALID_REASONS = new Set([
  'תוכן פוגעני', 'ספאם', 'הטרדה', 'מידע שקרי', 'פרסום לא רצוי', 'אחר',
])

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkReportRate(ip)) {
    return NextResponse.json({ error: 'יותר מדי דיווחים — נסה שוב עוד דקה' }, { status: 429 })
  }

  // Auth — require a valid Supabase session to prevent anonymous abuse
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  // Allow unauthenticated users too (chat has guest access) — just rate-limit them
  // If you want to require auth, uncomment:
  // if (!user) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const { messageId, reason, reporterUserId } = body as {
    messageId?: unknown
    reason?: unknown
    reporterUserId?: unknown
  }

  // Validate
  if (!messageId || typeof messageId !== 'string' || !/^[0-9a-f-]{36}$/i.test(messageId)) {
    return NextResponse.json({ error: 'מזהה הודעה לא תקין' }, { status: 400 })
  }
  if (!reason || typeof reason !== 'string' || !VALID_REASONS.has(reason.split(':')[0].trim())) {
    return NextResponse.json({ error: 'סיבת הדיווח לא תקינה' }, { status: 400 })
  }
  const cleanReason = reason.trim().slice(0, 500)

  const supabase = getServiceClient()

  // Verify the message exists
  const { data: message, error: msgErr } = await supabase
    .from('chat_messages')
    .select('id, user_id')
    .eq('id', messageId)
    .maybeSingle()

  if (msgErr || !message) {
    return NextResponse.json({ error: 'ההודעה לא נמצאה' }, { status: 404 })
  }

  // Resolve reporter_id: prefer the Supabase auth user's chat_users row,
  // then fall back to the client-supplied reporterUserId (chat_users.id)
  let resolvedReporterId: string | null = null
  if (user?.email) {
    const { data: chatUser } = await supabase
      .from('chat_users')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()
    if (chatUser) resolvedReporterId = chatUser.id
  }
  if (!resolvedReporterId && reporterUserId && typeof reporterUserId === 'string' && /^[0-9a-f-]{36}$/i.test(reporterUserId)) {
    resolvedReporterId = reporterUserId
  }

  // Prevent duplicate pending reports for the same message+reporter
  if (resolvedReporterId) {
    const { data: existing } = await supabase
      .from('message_reports')
      .select('id')
      .eq('message_id', messageId)
      .eq('reporter_id', resolvedReporterId)
      .eq('status', 'pending')
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ ok: true, message: 'כבר דיווחת על הודעה זו' })
    }
  }

  const { error: insertErr } = await supabase
    .from('message_reports')
    .insert({
      message_id: messageId,
      reporter_id: resolvedReporterId,
      reason: cleanReason,
      status: 'pending',
    })

  if (insertErr) {
    console.error('[report-message]', insertErr.message)
    return NextResponse.json({ error: 'שגיאה בשמירת הדיווח' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
