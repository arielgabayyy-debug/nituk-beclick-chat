import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_SUBJECT_LENGTH = 200
const MAX_CONTENT_LENGTH = 5000

export async function POST(request: Request) {
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

    const supabase = await createClient()

    // Get all subscribers and newsletter users with email
    const { data: users, error } = await supabase
      .from('chat_users')
      .select('email, name, user_type')
      .in('user_type', ['subscriber', 'newsletter'])
      .not('email', 'is', null)

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
