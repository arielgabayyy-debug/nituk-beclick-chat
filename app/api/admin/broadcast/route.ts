import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminRequest } from '@/lib/admin-auth'

// NOTE: Do NOT set runtime = 'edge' — in-memory rate limiting requires Node.js
// runtime so the Map persists across requests within the same server instance.

const MAX_SUBJECT_LENGTH = 200
const MAX_MESSAGE_LENGTH = 2000
const VALID_TARGET_TYPES = new Set(['all', 'subscribers', 'newsletter'])

// Simple in-memory rate limit: max 5 broadcasts per hour per admin
const rateLimitMap = new Map<string, { count: number; reset: number }>()
function isRateLimited(email: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(email)
  if (!entry || now > entry.reset) {
    rateLimitMap.set(email, { count: 1, reset: now + 3_600_000 })
    return false
  }
  if (entry.count >= 5) return true
  entry.count++
  return false
}

export async function POST(request: Request) {
  // Server-side admin verification via Authorization header token (not body email)
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // Rate limit per admin email
  if (isRateLimited(auth.email)) {
    return NextResponse.json({ error: 'גבול שליחה הושג — מקסימום 5 שידורים לשעה' }, { status: 429 })
  }

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 }) }
  const { subject, message, targetType } = body as {
    subject?: unknown
    message?: unknown
    targetType?: unknown
  }

  // ── Input validation ──────────────────────────────────────────────────
  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }
  if (subject.length > MAX_SUBJECT_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Content too long' }, { status: 400 })
  }
  if (!targetType || typeof targetType !== 'string' || !VALID_TARGET_TYPES.has(targetType)) {
    return NextResponse.json({ error: 'Invalid target type' }, { status: 400 })
  }

  const safeSubject = subject.trim()
  const safeMessage = message.trim()
  const safeTarget = targetType as 'all' | 'subscribers' | 'newsletter'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get target users — only those who have given email consent
  let query = supabase.from('chat_users').select('email, name').not('email', 'is', null).eq('email_consent', true)
  if (safeTarget === 'subscribers') {
    query = query.eq('user_type', 'subscriber')
  } else if (safeTarget === 'newsletter') {
    query = query.eq('user_type', 'newsletter')
  }

  const { data: users, error: usersError } = await query
  if (usersError) {
    console.error('[broadcast/users]', usersError)
    return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 })
  }

  const emails = (users || []).filter(u => u.email).map(u => u.email as string)

  if (emails.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: 'No users to send to' })
  }

  const htmlBody = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: linear-gradient(135deg, #06b6d4, #8b5cf6); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px; text-align: center;">
        <h1 style="margin: 0 0 8px; font-size: 22px;">📢 ${safeSubject.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
        <p style="margin: 0; opacity: 0.9; font-size: 14px;">מהקהילה שלנו</p>
      </div>
      <div style="background: #f9f9f9; border-radius: 12px; padding: 20px; margin-bottom: 20px; white-space: pre-wrap; line-height: 1.7; font-size: 15px;">
        ${safeMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}
      </div>
      <div style="text-align: center; margin-top: 24px;">
        <a href="https://nituk-beclick-chat.vercel.app" style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: white; padding: 12px 28px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 15px;">
          🚀 כנס לצ'אט
        </a>
      </div>
      <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
        קיבלת הודעה זו כי אתה חבר בקהילת חיבור וניתוק בקליק
      </p>
    </div>
  `

  let sent = 0
  let failed = 0

  // Send in batches of 50 via Resend REST API
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'נוזלטר <noreply@resend.dev>',
          to: batch,
          subject: safeSubject,
          html: htmlBody,
        }),
      })
      if (res.ok) { sent += batch.length } else { failed += batch.length }
    } catch {
      failed += batch.length
    }
  }

  // Audit log
  try {
    await supabase.from('admin_audit_log').insert({
      action: 'broadcast_email',
      target_type: 'broadcast',
      details: {
        subject: safeSubject,
        target_type: safeTarget,
        total_recipients: emails.length,
        sent,
        failed,
        admin_email: auth.email,
      },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true, sent, failed, total: emails.length })
}
