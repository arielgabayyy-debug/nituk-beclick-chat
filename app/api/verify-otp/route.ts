import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const MAX_ATTEMPTS = 5

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()
    if (!email || !code) {
      return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // ── Try our custom OTP table first (Resend flow) ──────────────────────
    const supabase = await createClient()
    const { data: otpRecord } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (otpRecord) {
      // Brute-force check
      const attempts = otpRecord.attempts ?? null
      if (attempts !== null && attempts >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: 'יותר מדי ניסיונות. בקש קוד חדש.' }, { status: 429 })
      }

      if (otpRecord.code !== code) {
        if (attempts !== null) {
          const newAttempts = attempts + 1
          await supabase.from('otp_codes').update({ attempts: newAttempts }).eq('email', normalizedEmail)
          const remaining = MAX_ATTEMPTS - newAttempts
          if (remaining <= 0) return NextResponse.json({ error: 'יותר מדי ניסיונות. בקש קוד חדש.' }, { status: 429 })
          return NextResponse.json({ error: `קוד שגוי. נותרו ${remaining} ניסיונות.` }, { status: 400 })
        }
        // Fall through to Supabase Auth verification (user might have gotten Supabase OTP)
      } else {
        // ✅ Custom OTP correct
        await supabase.from('otp_codes').delete().eq('email', normalizedEmail)
        return NextResponse.json({ success: true, verified: true })
      }
    }

    // ── Supabase Auth OTP verification (fallback flow) ────────────────────
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: verifyError } = await serviceClient.auth.verifyOtp({
      email: normalizedEmail,
      token: code,
      type: 'email',
    })

    if (verifyError) {
      console.error('Supabase OTP verify error:', verifyError)
      return NextResponse.json({ error: 'קוד שגוי או פג תוקף. בקש קוד חדש.' }, { status: 400 })
    }

    return NextResponse.json({ success: true, verified: true })

  } catch (err) {
    console.error('verify-otp error:', err)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
