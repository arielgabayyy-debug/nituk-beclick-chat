import { NextResponse } from 'next/server'
import { verifyTOTP } from '@/lib/totp'
import { createClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

const ADMIN_EMAILS = [
  'nitukbeclick@gmail.com',
  'arielgabayyy@gmail.com',
  'uziel10@gmail.com',
  'inbal2526@gmail.com',
  'hilaoh3263@gmail.com',
]

// Fail loudly if TOTP secret not configured — never use a hardcoded fallback
function getSecret(): string {
  const s = process.env.ADMIN_TOTP_SECRET
  if (!s) throw new Error('ADMIN_TOTP_SECRET is not set')
  return s
}

/**
 * Return the secret used to HMAC-sign the MFA session cookie.
 * Prefer ADMIN_MFA_COOKIE_SECRET (dedicated key) over ADMIN_TOTP_SECRET
 * so that the TOTP shared secret and the cookie signing key are independent.
 */
function getCookieSecret(): string {
  const s = process.env.ADMIN_MFA_COOKIE_SECRET || process.env.ADMIN_TOTP_SECRET
  if (!s) throw new Error('ADMIN_MFA_COOKIE_SECRET (or ADMIN_TOTP_SECRET) is not set')
  return s
}

export async function POST(request: Request) {
  try {
    const secret = getSecret()

    // 1. Verify the user is a logged-in admin
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user?.email) {
      return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })
    }
    if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return NextResponse.json({ error: 'אין הרשאות מנהל' }, { status: 403 })
    }

    // 2. Validate and verify the TOTP code
    const body = await request.json().catch(() => ({}))
    const { code } = body
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'קוד לא תקין' }, { status: 400 })
    }

    const isValid = verifyTOTP(code, secret)
    if (!isValid) {
      return NextResponse.json({ error: 'קוד שגוי — נסה שוב' }, { status: 401 })
    }

    // 3. Issue a signed session cookie (8 hours)
    const cookieSecret = getCookieSecret()
    const expires = Date.now() + 8 * 60 * 60 * 1000
    const payload = `${user.email}:${expires}`
    // Full SHA-256 digest — no truncation, uses dedicated cookie signing key
    const sig = createHmac('sha256', cookieSecret).update(payload).digest('hex')
    const cookieValue = `${Buffer.from(payload).toString('base64')}.${sig}`

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_mfa', cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60,
      path: '/',
    })
    return response

  } catch (err) {
    console.error('[mfa-verify]', err)
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 })
  }
}

export { validateMFACookie } from '@/lib/admin-mfa'
