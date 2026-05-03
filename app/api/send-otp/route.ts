import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Cryptographically secure 6-digit OTP
function generateOTP(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (100000 + (array[0] % 900000)).toString()
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'אימייל לא תקין' }, { status: 400 })
    }

    const supabase = await createClient()
    const normalizedEmail = email.toLowerCase().trim()

    // ── Rate limiting: 1 send per 60 seconds ─────────────────────────────
    const { data: existing } = await supabase
      .from('otp_codes')
      .select('last_sent_at')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing?.last_sent_at) {
      const elapsed = Date.now() - new Date(existing.last_sent_at).getTime()
      if (elapsed < 60_000) {
        const remaining = Math.ceil((60_000 - elapsed) / 1000)
        return NextResponse.json(
          { error: `נא להמתין ${remaining} שניות לפני שליחה חוזרת` },
          { status: 429 }
        )
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    const code = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Save OTP to DB (upsert — resets attempts on new code)
    const { error: dbError } = await supabase.from('otp_codes').upsert({
      email: normalizedEmail,
      code,
      expires_at: expiresAt.toISOString(),
      attempts: 0,
      last_sent_at: new Date().toISOString(),
    }, { onConflict: 'email' })

    if (dbError) {
      console.error('OTP DB error:', dbError)
      return NextResponse.json({ error: 'שגיאה בשמירת קוד' }, { status: 500 })
    }

    // ── Send via Resend ───────────────────────────────────────────────────
    const emailHtml = `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc">
        <div style="background:white;border-radius:20px;padding:36px;box-shadow:0 4px 24px rgba(0,0,0,0.07)">
          <div style="text-align:center;margin-bottom:28px">
            <h1 style="margin:0;font-size:26px;background:linear-gradient(135deg,#0891b2,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">
              חיבור וניתוק בקליק
            </h1>
            <p style="color:#64748b;margin:6px 0 0;font-size:14px">הקהילה הכי חוסכת בישראל</p>
          </div>

          <div style="background:linear-gradient(135deg,#f0f9ff,#f5f3ff);border-radius:16px;padding:28px;text-align:center">
            <p style="margin:0 0 8px;color:#475569;font-size:15px">קוד האימות שלך לכניסה לצ׳אט:</p>
            <div style="background:white;border-radius:14px;padding:20px 32px;display:inline-block;box-shadow:0 4px 20px rgba(8,145,178,0.18);margin:12px 0">
              <span style="font-size:44px;font-weight:800;letter-spacing:14px;background:linear-gradient(135deg,#0891b2,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${code}</span>
            </div>
            <p style="margin:8px 0 0;color:#94a3b8;font-size:13px">הקוד תקף ל-10 דקות בלבד</p>
          </div>

          <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:28px;line-height:1.7">
            לא ביקשת קוד? ניתן להתעלם מהודעה זו.<br>
            הקוד חד-פעמי ומתחלף בכל בקשה.
          </p>
        </div>
      </div>
    `

    if (process.env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'ניתוק בקליק <onboarding@resend.dev>',
          to: email,
          subject: `${code} — קוד הכניסה שלך לצ׳אט`,
          html: emailHtml,
        }),
      })

      if (res.ok) {
        return NextResponse.json({ success: true })
      }
      const errText = await res.text()
      console.error('Resend error:', errText)
      return NextResponse.json({ error: 'שגיאה בשליחת המייל' }, { status: 500 })
    }

    // No provider
    return NextResponse.json(
      { error: 'שירות המייל אינו פעיל. נסה להתחבר עם Google.' },
      { status: 503 }
    )

  } catch (err) {
    console.error('send-otp error:', err)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
