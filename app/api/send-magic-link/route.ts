import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ADMIN_EMAILS = ['nitukbeclick@gmail.com', 'arielgabayyy@gmail.com', 'uziel10@gmail.com', 'inbal2526@gmail.com']

export async function POST(request: Request) {
  try {
    const { email, redirectTo, intendedType, displayName, avatarColor } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()
    const origin = new URL(request.url).origin
    const callbackUrl = redirectTo || `${origin}/auth/callback`

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── Check if returning user ────────────────────────────────────────────
    const { data: existingRows } = await supabase
      .from('chat_users')
      .select('id, name, user_type')
      .eq('email', trimmedEmail)
      .limit(1)

    const existingUser = existingRows?.[0] ?? null
    const isAdmin = ADMIN_EMAILS.includes(trimmedEmail)
    const finalType = isAdmin ? 'admin' : (existingUser?.user_type ?? intendedType ?? 'subscriber')
    const finalName = displayName || existingUser?.name || trimmedEmail.split('@')[0]

    // ── Generate magic link via Supabase Admin ─────────────────────────────
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: trimmedEmail,
      options: {
        redirectTo: callbackUrl,
        data: {
          display_name: finalName,
          intended_type: finalType,
          avatar_color: avatarColor || '#06b6d4',
        },
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('generateLink error:', linkError?.message)
      return NextResponse.json({ error: linkError?.message || 'שגיאה ביצירת הקישור' }, { status: 500 })
    }

    const magicLink = linkData.properties.action_link

    // ── Send via Resend REST API (no SMTP, no rate limits) ─────────────────
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ניתוק בקליק <onboarding@resend.dev>',
        to: [trimmedEmail],
        subject: 'הקישור שלך לכניסה — ניתוק בקליק',
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f172a;color:#f8fafc;border-radius:12px;">
            <h2 style="color:#06b6d4;margin-bottom:8px;">ניתוק בקליק 🔌</h2>
            <p style="color:#94a3b8;margin-bottom:4px;">שלום ${finalName},</p>
            <p style="margin-bottom:24px;">
              ${existingUser ? 'ברוך הבא בחזרה! לחץ כדי להיכנס לצ׳אט הקהילתי:' : 'ברוך הבא! לחץ כדי להיכנס ולהצטרף לצ׳אט הקהילתי:'}
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

    if (!resendRes.ok) {
      const resendErr = await resendRes.json().catch(() => ({}))
      console.error('Resend error:', resendErr)
      return NextResponse.json({ error: 'שגיאה בשליחת המייל' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      isReturning: !!existingUser,
      name: finalName,
    })
  } catch (err) {
    console.error('send-magic-link error:', err)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
