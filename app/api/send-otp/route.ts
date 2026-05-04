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

    // ── Primary: Resend (if configured) ──────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      // Generate and store our own code for Resend flow
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()

      // Rate limit
      try {
        const { data: existing } = await supabase
          .from('otp_codes')
          .select('last_sent_at')
          .eq('email', normalizedEmail)
          .maybeSingle()
        if (existing?.last_sent_at) {
          const elapsed = Date.now() - new Date(existing.last_sent_at).getTime()
          if (elapsed < 60_000) {
            const remaining = Math.ceil((60_000 - elapsed) / 1000)
            return NextResponse.json({ error: `נא להמתין ${remaining} שניות` }, { status: 429 })
          }
        }
      } catch { /* skip */ }

      const arr = new Uint32Array(1)
      crypto.getRandomValues(arr)
      const code = (100000 + (arr[0] % 900000)).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      await supabase.from('otp_codes').upsert(
        { email: normalizedEmail, code, expires_at: expiresAt.toISOString(), attempts: 0, last_sent_at: new Date().toISOString() },
        { onConflict: 'email' }
      ).catch(() =>
        supabase.from('otp_codes').upsert(
          { email: normalizedEmail, code, expires_at: expiresAt.toISOString() },
          { onConflict: 'email' }
        )
      )

      const fromAddr = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
      const emailHtml = `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc">
          <div style="background:white;border-radius:20px;padding:36px">
            <h1 style="text-align:center;font-size:22px;color:#0891b2">חיבור וניתוק בקליק</h1>
            <div style="background:#f0f9ff;border-radius:16px;padding:24px;text-align:center;margin:20px 0">
              <p style="color:#475569;margin:0 0 12px">קוד האימות שלך:</p>
              <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#0891b2">${code}</div>
              <p style="color:#94a3b8;font-size:12px;margin:12px 0 0">תקף ל-10 דקות</p>
            </div>
          </div>
        </div>`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromAddr, to: email, subject: `${code} — קוד הכניסה שלך`, html: emailHtml }),
      })

      if (res.ok) return NextResponse.json({ success: true, via: 'resend' })
      const resendErr = await res.text()
      console.error('Resend failed:', resendErr)
      // Fall through to Supabase Auth
    }

    // ── Fallback: Supabase Auth built-in OTP (free, no setup needed) ──────
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await serviceClient.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: true },
    })

    if (error) {
      console.error('Supabase OTP error:', error)
      return NextResponse.json({ error: 'שגיאה בשליחת המייל. נסה להתחבר עם Google.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, via: 'supabase' })

  } catch (err) {
    console.error('send-otp error:', err)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
