import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Generate a cryptographically secure 6-digit OTP code
function generateOTP(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (100000 + (array[0] % 900000)).toString()
}

// Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'אימייל לא תקין' }, { status: 400 })
    }

    const supabase = await createClient()
    const normalizedEmail = email.toLowerCase().trim()

    // ── Rate limiting: max 1 send per 60 seconds ──────────────────────────
    const { data: existing } = await supabase
      .from('otp_codes')
      .select('last_sent_at')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing?.last_sent_at) {
      const elapsed = Date.now() - new Date(existing.last_sent_at).getTime()
      if (elapsed < 60 * 1000) {
        const remaining = Math.ceil((60 * 1000 - elapsed) / 1000)
        return NextResponse.json(
          { error: `נא להמתין ${remaining} שניות לפני שליחה חוזרת` },
          { status: 429 }
        )
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    const code = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Upsert OTP — reset attempts counter and update last_sent_at
    const { error: insertError } = await supabase.from('otp_codes').upsert({
      email: normalizedEmail,
      code,
      expires_at: expiresAt.toISOString(),
      attempts: 0,
      last_sent_at: new Date().toISOString(),
    }, { onConflict: 'email' })

    if (insertError) {
      console.error('Error inserting OTP:', insertError)
      return NextResponse.json({ error: 'שגיאה בשליחת קוד' }, { status: 500 })
    }

    const emailHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="background: linear-gradient(135deg, #0891b2, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; font-size: 28px;">חיבור וניתוק בקליק</h1>
            <p style="color: #64748b; margin: 5px 0 0 0;">הקהילה הכי חוסכת בישראל</p>
          </div>

          <div style="background: linear-gradient(135deg, #f0f9ff, #f5f3ff); border-radius: 16px; padding: 30px; text-align: center;">
            <h2 style="color: #0f172a; margin: 0 0 10px 0; font-size: 20px;">קוד האימות שלך</h2>
            <p style="color: #64748b; margin: 0 0 20px 0;">הקוד תקף ל-10 דקות בלבד</p>

            <div style="background: white; border-radius: 12px; padding: 20px 30px; display: inline-block; box-shadow: 0 4px 20px rgba(8, 145, 178, 0.2);">
              <span style="font-size: 42px; font-weight: bold; letter-spacing: 12px; background: linear-gradient(135deg, #0891b2, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${code}</span>
            </div>
          </div>

          <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 30px; line-height: 1.6;">
            אם לא ביקשת קוד זה, ניתן להתעלם מהודעה זו.<br>
            הקוד מתחלף בכל בקשה חדשה ותקף לדקות ספורות.
          </p>
        </div>
      </div>
    `

    // ── Try Resend ────────────────────────────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'חיבור וניתוק בקליק <onboarding@resend.dev>',
          to: email,
          subject: `${code} — קוד האימות שלך`,
          html: emailHtml,
        }),
      })

      if (response.ok) {
        return NextResponse.json({ success: true })
      }
      const errText = await response.text()
      console.error('Resend error:', errText)
    }

    // ── Try SendGrid ──────────────────────────────────────────────────────
    if (process.env.SENDGRID_API_KEY) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: process.env.SENDGRID_FROM_EMAIL || 'noreply@nitukbeclick.co.il' },
          subject: `${code} — קוד האימות שלך`,
          content: [{ type: 'text/html', value: emailHtml }],
        }),
      })

      if (response.ok) {
        return NextResponse.json({ success: true })
      }
      console.error('SendGrid error:', await response.text())
    }

    // ── No email provider configured ─────────────────────────────────────
    console.error('No email provider configured. Set RESEND_API_KEY in environment variables.')
    return NextResponse.json(
      { error: 'שירות המייל אינו פעיל כרגע. נסה להתחבר עם Google.' },
      { status: 503 }
    )

  } catch (error) {
    console.error('Error in send-otp:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
