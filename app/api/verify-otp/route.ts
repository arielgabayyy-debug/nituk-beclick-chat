import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify the OTP using Supabase Auth built-in verification.
    // Supabase handles brute-force protection and expiry automatically.
    const { error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase().trim(),
      token: code,
      type: 'email',
    })

    if (error) {
      console.error('OTP verify error:', error.message)

      if (error.message.includes('expired')) {
        return NextResponse.json({ error: 'הקוד פג תוקף. בקש קוד חדש.' }, { status: 400 })
      }
      if (error.message.includes('Invalid') || error.message.includes('invalid')) {
        return NextResponse.json({ error: 'קוד שגוי. נסה שוב.' }, { status: 400 })
      }
      return NextResponse.json({ error: 'קוד שגוי או פג תוקף' }, { status: 400 })
    }

    return NextResponse.json({ success: true, verified: true })
  } catch (error) {
    console.error('Error in verify-otp:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
