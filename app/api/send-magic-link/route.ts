import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const BREVO_API_KEY = process.env.BREVO_API_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ADMIN_EMAILS = ['nitukbeclick@gmail.com', 'arielgabayyy@gmail.com', 'uziel10@gmail.com', 'inbal2526@gmail.com', 'hilaoh3263@gmail.com']

const SENDER_EMAIL = 'arielgabayyy@gmail.com'
const SENDER_NAME = 'ניתוק בקליק'

// ── In-memory rate limiting: max 3 magic links per email per 10 minutes ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 3
const RATE_WINDOW_MS = 10 * 60 * 1000

function checkRateLimit(email: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(email)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

// ── Input validation ──────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME_LENGTH = 50
const ALLOWED_TYPES = ['subscriber', 'newsletter', 'guest']

function sanitizeString(s: unknown, maxLen = 100): string {
  if (typeof s !== 'string') return ''
  return s.trim().slice(0, maxLen).replace(/[<>]/g, '')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email: rawEmail, redirectTo, intendedType: rawType, displayName: rawName, avatarColor: rawColor } = body

    // Validate email
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 })
    }

    // Sanitize inputs
    const displayName = sanitizeString(rawName, MAX_NAME_LENGTH)
    const intendedType = ALLOWED_TYPES.includes(rawType) ? rawType : 'subscriber'
    const avatarColor = /^#[0-9A-Fa-f]{6}$/.test(rawColor) ? rawColor : '#06b6d4'

    // Rate limit check
    if (!checkRateLimit(email)) {
      return NextResponse.json({ error: 'יותר מדי בקשות. נסה שוב בעוד 10 דקות.' }, { status: 429 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── Check if returning user ────────────────────────────────────────────
    const { data: existingRows } = await supabase
      .from('chat_users')
      .select('id, name, user_type')
      .eq('email', email)
      .limit(1)

    const existingUser = existingRows?.[0] ?? null
    const isAdmin = ADMIN_EMAILS.includes(email)
    const finalType = isAdmin ? 'admin' : (existingUser?.user_type ?? intendedType)
    const finalName = displayName || existingUser?.name || email.split('@')[0]

    // Sanitize redirect URL — only allow same-origin or known domains
    const origin = new URL(request.url).origin
    const callbackUrl = redirectTo?.startsWith(origin) || redirectTo?.startsWith('https://nitukbeclick.co.il')
      ? redirectTo
      : `${origin}/auth/callback`

    // ── Generate magic link via Supabase Admin ─────────────────────────────
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: callbackUrl,
        data: {
          display_name: finalName,
          intended_type: finalType,
          avatar_color: avatarColor,
        },
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('generateLink error:', linkError?.message)
      return NextResponse.json({ error: linkError?.message || 'שגיאה ביצירת הקישור' }, { status: 500 })
    }

    const magicLink = linkData.properties.action_link
    const isReturning = !!existingUser

    // ── Send via Brevo API (no domain verification needed) ─────────────────
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: email, name: finalName }],
        subject: 'הקישור שלך לכניסה — ניתוק בקליק',
        htmlContent: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f172a;color:#f8fafc;border-radius:12px;">
            <h2 style="color:#06b6d4;margin-bottom:8px;">ניתוק בקליק 🔌</h2>
            <p style="color:#94a3b8;margin-bottom:4px;">שלום ${finalName},</p>
            <p style="margin-bottom:24px;">
              ${isReturning
                ? 'ברוך הבא בחזרה! לחץ כדי להיכנס לצ׳אט הקהילתי:'
                : 'ברוך הבא! לחץ כדי להצטרף לצ׳אט הקהילתי:'}
            </p>
            <a href="${magicLink}"
               style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#8b5cf6);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;margin-bottom:24px;">
              כניסה לצ׳אט ←
            </a>
            <p style="color:#64748b;font-size:13px;margin-top:24px;">הקישור תקף ל-24 שעות.</p>
            <p style="color:#64748b;font-size:13px;">אם לא ביקשת קישור זה, ניתן להתעלם ממייל זה.</p>
          </div>
        `,
      }),
    })

    if (!brevoRes.ok) {
      const brevoErr = await brevoRes.json().catch(() => ({}))
      console.error('Brevo error:', JSON.stringify(brevoErr))
      return NextResponse.json({ error: 'שגיאה בשליחת המייל' }, { status: 500 })
    }

    return NextResponse.json({ success: true, isReturning, name: finalName })
  } catch (err) {
    console.error('send-magic-link error:', err)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
