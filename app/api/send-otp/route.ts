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

    // Use Supabase Auth built-in OTP — works for any email, no config needed
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: true },
    })

    if (error) {
      console.error('Supabase OTP error:', error.message)
      return NextResponse.json({ error: 'שגיאה בשליחת המייל. נסה שוב.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, v: 3 })

  } catch (err) {
    console.error('send-otp error:', err)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
