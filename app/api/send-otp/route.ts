import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'אימייל לא תקין' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Generate a magic link URL using admin API (doesn't count against email rate limit)
    const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: 'https://nituk-beclick-chat.vercel.app/auth/callback',
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('generateLink error:', linkError)
      return NextResponse.json({ error: 'שגיאה ביצירת קישור כניסה' }, { status: 500 })
    }

    const magicLink = linkData.properties.action_link

    const emailHtml = `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc">
        <div style="background:white;border-radius:20px;padding:36px;box-shadow:0 4px 24px rgba(0,0,0,0.07)">
          <div style="text-align:center;margin-bottom:28px">
            <h1 style="margin:0;font-size:26px;color:#0891b2">חיבור וניתוק בקליק</h1>
            <p style="color:#64748b;margin:6px 0 0;font-size:14px">הקהילה הכי חוסכת בישראל</p>
          </div>
          <div style="background:linear-gradient(135deg,#f0f9ff,#f5f3ff);border-radius:16px;padding:28px;text-align:center">
            <p style="margin:0 0 20px;color:#475569;font-size:15px">לחצו על הכפתור להיכנס לצ׳אט:</p>
            <a href="${magicLink}"
              style="display:inline-block;background:linear-gradient(135deg,#0891b2,#8b5cf6);color:white;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 4px 20px rgba(8,145,178,0.3)">
              🚀 כניסה לצ׳אט
            </a>
            <p style="margin:16px 0 0;color:#94a3b8;font-size:12px">הקישור תקף ל-24 שעות</p>
          </div>
          <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px">
            לא ביקשת להיכנס? ניתן להתעלם מהודעה זו.
          </p>
        </div>
      </div>`

    // ── Try Resend first ──────────────────────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      const fromAddr = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddr,
          to: normalizedEmail,
          subject: 'הקישור שלך לכניסה לצ׳אט — חיבור וניתוק בקליק',
          html: emailHtml,
        }),
      })

      if (res.ok) return NextResponse.json({ success: true })

      const resendErr = await res.text()
      console.error('Resend failed:', resendErr)
    }

    // ── Fallback: Supabase built-in OTP (subject to rate limits) ─────────
    const anonClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error: otpError } = await anonClient.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'https://nituk-beclick-chat.vercel.app/auth/callback',
      },
    })

    if (otpError) {
      console.error('Supabase OTP error:', otpError.message)
      if (otpError.message?.includes('rate limit') || otpError.status === 429) {
        return NextResponse.json(
          { error: 'נסו שוב בעוד מספר דקות.' },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: 'שגיאה בשליחת המייל. נסה שוב.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('send-otp error:', err)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
