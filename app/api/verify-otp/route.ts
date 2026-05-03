import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
    }

    const supabase = await createClient()

    // Find the OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (fetchError || !otpRecord) {
      return NextResponse.json({ error: 'קוד שגוי או פג תוקף' }, { status: 400 })
    }

    // Delete the used OTP
    await supabase
      .from('otp_codes')
      .delete()
      .eq('email', email.toLowerCase().trim())

    return NextResponse.json({ success: true, verified: true })
  } catch (error) {
    console.error('Error in verify-otp:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
