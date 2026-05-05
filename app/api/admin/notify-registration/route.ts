import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const ADMIN_EMAIL = 'nitukbeclick@gmail.com'

// ── Simple in-memory rate limiter (per IP, max 5 req/min) ─────────────────
const rateLimitMap = new Map<string, { count: number; reset: number }>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 60_000 })
    return false
  }
  if (entry.count >= 5) return true
  entry.count++
  return false
}

const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 255
const VALID_USER_TYPES = new Set(['subscriber', 'newsletter', 'guest', 'admin'])

const USER_TYPE_LABEL: Record<string, string> = {
  subscriber:  'מנוי פרימיום ⭐',
  newsletter:  'מנוי ניוזלטר 📰',
  guest:       'אורח 👤',
  admin:       'מנהל 👑',
}

function buildHtml(name: string, email: string | undefined, typeLabel: string, now: string) {
  return `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
      <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display:inline-block; background: linear-gradient(135deg, #0891b2, #8b5cf6); padding: 12px 24px; border-radius: 12px; margin-bottom: 10px;">
            <h1 style="margin: 0; font-size: 20px; color: white; letter-spacing: -0.5px;">ניתוק בקליק</h1>
          </div>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">התראת הרשמה חדשה</p>
        </div>

        <div style="background: linear-gradient(135deg, #f0f9ff, #f5f3ff); border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #e0e7ff;">
          <div style="font-size: 48px; text-align: center; margin-bottom: 12px;">🎉</div>
          <h2 style="text-align: center; margin: 0 0 4px 0; color: #0f172a; font-size: 20px;">משתמש חדש נרשם!</h2>
          <p style="text-align: center; color: #64748b; margin: 0 0 20px 0; font-size: 14px;">${now}</p>

          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 0; color: #64748b; font-size: 14px; width: 30%;">👤 שם</td>
              <td style="padding: 12px 0; font-weight: bold; color: #0f172a; font-size: 16px;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 0; color: #64748b; font-size: 14px;">📧 אימייל</td>
              <td style="padding: 12px 0; color: #0891b2; font-size: 14px;" dir="ltr">${email || '<em style="color:#94a3b8">לא הוזן</em>'}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #64748b; font-size: 14px;">🏷️ סוג</td>
              <td style="padding: 12px 0;">
                <span style="background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">${typeLabel}</span>
              </td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <a href="https://nituk-beclick-chat.vercel.app/admin"
             style="display: inline-block; background: linear-gradient(135deg, #0891b2, #8b5cf6); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px;">
            🔑 פתח דאשבורד מנהל
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0; padding-top: 16px; border-top: 1px solid #f1f5f9;">
          ניתוק בקליק — מערכת ניהול קהילה | מייל אוטומטי, אין צורך להשיב
        </p>
      </div>
    </div>
  `
}

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'יותר מדי בקשות' }, { status: 429 })
    }

    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 }) }
    const { name, email, userType } = body as { name?: unknown; email?: unknown; userType?: unknown }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'חסרים שדות' }, { status: 400 })
    }
    if (!userType || typeof userType !== 'string' || !VALID_USER_TYPES.has(userType)) {
      return NextResponse.json({ error: 'סוג משתמש לא תקין' }, { status: 400 })
    }
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: 'שם ארוך מדי' }, { status: 400 })
    }
    if (email && (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH)) {
      return NextResponse.json({ error: 'אימייל לא תקין' }, { status: 400 })
    }

    const safeName = name.trim()
    const safeEmail = email && typeof email === 'string' ? email.toLowerCase().trim() : undefined
    const safeUserType = userType as string

    // Skip guests
    if (safeUserType === 'guest') {
      return NextResponse.json({ success: true, method: 'skipped_guest' })
    }

    const fromTrigger = request.headers.get('x-trigger-source') === 'supabase'
    const typeLabel   = USER_TYPE_LABEL[safeUserType] || safeUserType
    const now         = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
    const subject     = `🎉 נרשם משתמש חדש: ${safeName} (${typeLabel})`
    const html        = buildHtml(safeName, safeEmail, typeLabel, now)

    // ── 1. Log to DB (only when called from frontend — trigger logs itself) ─
    if (!fromTrigger) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        )
        await supabase.from('admin_notifications').insert({
          type:       'new_registration',
          user_name:  safeName,
          user_email: safeEmail || null,
          user_type:  safeUserType,
        })
      } catch (dbErr) {
        console.warn('[notify] DB log failed:', dbErr)
      }
    }

    // ── 2. Gmail SMTP via Nodemailer (primary) ────────────────────────────
    if (process.env.GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER || ADMIN_EMAIL,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      })

      await transporter.sendMail({
        from:    `"ניתוק בקליק 🔔" <${process.env.GMAIL_USER || ADMIN_EMAIL}>`,
        to:      ADMIN_EMAIL,
        subject,
        html,
      })

      console.log(`[notify] Email sent via Gmail — ${safeName} (${safeUserType})`)
      return NextResponse.json({ success: true, method: 'gmail' })
    }

    // ── 3. Resend fallback ────────────────────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    process.env.RESEND_FROM_EMAIL || 'ניתוק בקליק <onboarding@resend.dev>',
          to:      ADMIN_EMAIL,
          subject,
          html,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        console.log(`[notify] Email sent via Resend — ${safeName} (id: ${data.id})`)
        return NextResponse.json({ success: true, method: 'resend', emailId: data.id })
      }
      console.error('[notify] Resend error:', await res.text())
    }

    // ── 4. No email provider configured — just DB log ────────────────────
    console.log(`[notify] No email provider — DB logged only. User: ${safeName} (${safeUserType})`)
    return NextResponse.json({ success: true, method: 'db_logged' })

  } catch (err) {
    console.error('[notify] error:', err)
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-trigger-source',
    },
  })
}
