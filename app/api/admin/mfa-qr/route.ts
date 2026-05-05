import { NextResponse } from 'next/server'
import { generateOTPAuthURI } from '@/lib/totp'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = [
  'nitukbeclick@gmail.com',
  'arielgabayyy@gmail.com',
  'uziel10@gmail.com',
  'inbal2526@gmail.com',
  'hilaoh3263@gmail.com',
]

const TOTP_SECRET = process.env.ADMIN_TOTP_SECRET || 'HWTCDGQFDRLRQ7ZBUGRWTTTUHRS'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const otpauth = generateOTPAuthURI(TOTP_SECRET, user.email, 'ניתוק בקליק Admin')
    const qrDataUrl = await QRCode.toDataURL(otpauth, { width: 256, margin: 2 })

    return NextResponse.json({
      qr: qrDataUrl,
      secret: TOTP_SECRET,
      account: 'ניתוק בקליק Admin',
    })
  } catch (err) {
    console.error('[mfa-qr]', err)
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
