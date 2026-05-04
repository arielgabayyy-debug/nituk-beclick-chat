import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()
    if (!email || !code) {
      return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Verify using Supabase Auth OTP
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: code,
      type: 'email',
    })

    if (error) {
      console.error('OTP verify error:', error.message)
      return NextResponse.json({ error: 'קוד שגוי או פג תוקף. בקש קוד חדש.' }, { status: 400 })
    }

    return NextResponse.json({ success: true, verified: true })

  } catch (err) {
    console.error('verify-otp error:', err)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
