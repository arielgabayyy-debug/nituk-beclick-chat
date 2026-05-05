import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminRequest } from '@/lib/admin-auth'

const MAX_SUBJECT_LENGTH = 200
const MAX_CONTENT_LENGTH = 5000

// Simple in-memory rate limit: max 2 newsletter sends per hour per admin
const rateLimitMap = new Map<string, { count: number; reset: number }>()
function isRateLimited(email: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(email)
  if (!entry || now > entry.reset) {
    rateLimitMap.set(email, { count: 1, reset: now + 3_600_000 })
    return false
  }
  if (entry.count >= 2) return true
  entry.count++
  return false
}

export async function POST(request: Request) {
  // Server-side admin verification (defense in depth beyond middleware)
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // Rate limit per admin email
  if (isRateLimited(auth.email)) {
    return NextResponse.json({ error: 'גבול שליחה הושג — מקסימום 2 ניוזלטרים לשעה' }, { status: 429 })
  }

  try {
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 }) }
    const { subject, content } = body as { subject?: unknown; content?: unknown }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json({ error: 'חסר נושא או תוכן' }, { status: 400 })
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'חסר נושא או תוכן' }, { status: 400 })
    }
    if (subject.length > MAX_SUBJECT_LENGTH || content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: 'תוכן ארוך מדי' }, { status: 400 })
    }

    const safeSubject = subject.trim()
    const safeContent = content.trim()

    // Module-level singleton would be ideal but newsletter sends are infrequent;
    // single-instance approach here for simplicity
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get all subscribers and newsletter users with email who have consented
    const { data: users, error } = await supabase
      .from('chat_users')
      .select('email, name, user_type')
      .in('user_type', ['subscriber', 'newsletter'])
      .not('email', 'is', null)
      .eq('email_consent', true)

    if (error) throw error

    const recipients = users?.filter(u => u.email) || []

    if (recipients.length === 0) {
      return NextResponse.json({ message: 'אין נמענים רשומים עדיין' })
    }

    const emailHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="background: linear-gradient(135deg, #0891b2, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; font-size: 28px;">
              ניתוק בקליק
            </h1>
            <p style="color: #64748b; margin: 5px 0 0 0;">הקהילה הכי חוסכת בישראל</p>
          </div>

          <div style="background: linear-gradient(135deg, #f0f9ff, #f5f3ff); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 20px;">${safeSubject.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h2>
            <div style="color: #334155; line-height: 1.8; white-space: pre-wrap;">${safeContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="https://nitukbeclick.co.il"
               style="display: inline-block; background: linear-gradient(135deg, #0891b2, #8b5cf6); color: white; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: bold;">
              כנסו לצ׳אט הקהילה
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
            קיבלתם מייל זה כי נרשמתם לקהילת ניתוק בקליק.<br>
            להסרה מהרשימה - פנו אלינו בצ׳אט.
          </p>
        </div>
      </div>
    `

    let sentCount = 0
    let errors = 0

    // Send to each recipient
    if (process.env.RESEND_API_KEY) {
      for (const user of recipients) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL || 'ניתוק בקליק <noreply@resend.dev>',
              to: user.email,
              subject: safeSubject,
              html: emailHtml,
            }),
          })
          if (res.ok) sentCount++
          else errors++
        } catch {
          errors++
        }
      }
    } else {
      // Dev mode - just return count
      return NextResponse.json({
        message: `מצב פיתוח: היה שולח ל-${recipients.length} נמענים`,
        recipients: recipients.map(u => u.email),
        devMode: true
      })
    }

    // Audit log
    try {
      await supabase.from('admin_audit_log').insert({
        action: 'send_newsletter',
        target_type: 'newsletter',
        details: {
          subject: safeSubject,
          recipient_count: recipients.length,
          sent: sentCount,
          errors,
          admin_email: auth.email,
        },
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({
      message: `נשלח בהצלחה ל-${sentCount} נמענים${errors > 0 ? ` (${errors} שגיאות)` : ''}`,
      sentCount,
      errors
    })

  } catch (error) {
    console.error('Newsletter error:', error)
    return NextResponse.json({ error: 'שגיאה בשליחת הניוזלטר' }, { status: 500 })
  }
}
