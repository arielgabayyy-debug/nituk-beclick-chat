import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    // Use Supabase Auth built-in OTP — no external email service needed.
    // Supabase sends a 6-digit code to the user's email automatically.
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
      },
    })

    if (error) {
      console.error('Supabase OTP error:', error.message)

      // Rate-limit message from Supabase
      if (error.message.includes('rate') || error.status === 429) {
        return NextResponse.json(
          { error: 'נא להמתין לפני שליחה חוזרת' },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: 'שגיאה בשליחת הקוד' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in send-otp:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
