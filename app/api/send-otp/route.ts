import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nituk-beclick-chat.vercel.app'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'אימייל לא תקין' }, { status: 400 })
    }

    const supabase = await createClient()
    const normalizedEmail = email.toLowerCase().trim()

    // Send magic link via Supabase Auth (built-in email, no external service needed).
    // When user clicks the link, they are redirected to our app and the session
    // is established — detected automatically via onAuthStateChange in the client.
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${BASE_URL}/?auth_callback=1`,
      },
    })

    if (error) {
      console.error('Supabase OTP error:', error.message)

      if (error.message.toLowerCase().includes('rate')) {
        return NextResponse.json(
          { error: 'נשלח לאחרונה. המתן מספר דקות לפני שליחה חוזרת.' },
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
