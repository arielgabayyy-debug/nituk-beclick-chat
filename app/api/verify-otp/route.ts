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

    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (fetchError || !otpRecord) {
      return NextResponse.json({ error: 'קוד שגוי או פג תוקף. בקש קוד חדש.' }, { status: 400 })
    }

    // Brute-force check (graceful — skipped if column missing)
    const attempts = otpRecord.attempts ?? null
    if (attempts !== null && attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'יותר מדי ניסיונות. בקש קוד חדש.' }, { status: 429 })
    }

    // Wrong code
    if (otpRecord.code !== code) {
      // Try to increment attempts (ignore error if column missing)
      if (attempts !== null) {
        const newAttempts = attempts + 1
        await supabase
          .from('otp_codes')
          .update({ attempts: newAttempts })
          .eq('email', normalizedEmail)

        const remaining = MAX_ATTEMPTS - newAttempts
        if (remaining <= 0) {
          return NextResponse.json({ error: 'יותר מדי ניסיונות. בקש קוד חדש.' }, { status: 429 })
        }
        return NextResponse.json({ error: `קוד שגוי. נותרו ${remaining} ניסיונות.` }, { status: 400 })
      }
      return NextResponse.json({ error: 'קוד שגוי. נסה שוב.' }, { status: 400 })
    }

    // ✅ Correct — delete so it can't be reused
    await supabase.from('otp_codes').delete().eq('email', normalizedEmail)

    return NextResponse.json({ success: true, verified: true })

  } catch (err) {
    console.error('verify-otp error:', err)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
