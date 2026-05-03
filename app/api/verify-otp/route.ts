import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_ATTEMPTS = 5

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
    }

    const supabase = await createClient()
    const normalizedEmail = email.toLowerCase().trim()

    // Find active OTP record (not expired)
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (fetchError || !otpRecord) {
      return NextResponse.json({ error: 'קוד שגוי או פג תוקף. בקש קוד חדש.' }, { status: 400 })
    }

    const currentAttempts = otpRecord.attempts ?? 0

    // ── Brute-force protection: block after MAX_ATTEMPTS wrong tries ──────
    if (currentAttempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'יותר מדי ניסיונות שגויים. בקש קוד חדש.' },
        { status: 429 }
      )
    }
    // ─────────────────────────────────────────────────────────────────────

    // Wrong code — increment attempt counter
    if (otpRecord.code !== code) {
      const newAttempts = currentAttempts + 1
      await supabase
        .from('otp_codes')
        .update({ attempts: newAttempts })
        .eq('email', normalizedEmail)

      const remaining = MAX_ATTEMPTS - newAttempts
      if (remaining <= 0) {
        return NextResponse.json(
          { error: 'יותר מדי ניסיונות שגויים. בקש קוד חדש.' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: `קוד שגוי. נותרו ${remaining} ניסיונות.` },
        { status: 400 }
      )
    }

    // ── Code is correct — delete it so it can't be reused ────────────────
    await supabase
      .from('otp_codes')
      .delete()
      .eq('email', normalizedEmail)

    return NextResponse.json({ success: true, verified: true })

  } catch (error) {
    console.error('Error in verify-otp:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
