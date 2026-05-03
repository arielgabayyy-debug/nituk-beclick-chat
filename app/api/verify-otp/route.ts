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
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (fetchError || !otpRecord) {
      return NextResponse.json({ error: 'קוד שגוי או פג תוקף' }, { status: 400 })
    }

    // Mark as verified
    await supabase
      .from('otp_codes')
      .update({ verified: true })
      .eq('id', otpRecord.id)

    // Clean up old codes for this email
    await supabase
      .from('otp_codes')
      .delete()
      .eq('email', email.toLowerCase())
      .neq('id', otpRecord.id)

    return NextResponse.json({ success: true, verified: true })
  } catch (error) {
    console.error('Error in verify-otp:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
