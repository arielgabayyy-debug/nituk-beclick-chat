import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'nitukbeclick@gmail.com'

const USER_TYPE_LABEL: Record<string, string> = {
  subscriber: 'מנוי פרימיום',
  newsletter: 'מנוי ניוזלטר',
  guest: 'אורח',
  admin: 'מנהל',
}

export async function POST(request: Request) {
  try {
    const { name, email, userType } = await request.json()

    const typeLabel = USER_TYPE_LABEL[userType] || userType
    const subject = `🎉 נרשם משתמש חדש: ${name}`
    const now = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })

    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="margin: 0; font-size: 24px; background: linear-gradient(135deg, #0891b2, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              חיבור וניתוק בקליק
            </h1>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">דאשבורד מנהל — התראת הרשמה</p>
          </div>

          <div style="background: linear-gradient(135deg, #f0f9ff, #f5f3ff); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <div style="font-size: 40px; text-align: center; margin-bottom: 12px;">🎉</div>
            <h2 style="text-align: center; margin: 0 0 8px 0; color: #0f172a;">משתמש חדש נרשם!</h2>

            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 0; color: #64748b; font-size: 14px; width: 30%;">שם</td>
                <td style="padding: 10px 0; font-weight: bold; color: #0f172a;">${name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">אימייל</td>
                <td style="padding: 10px 0; color: #0891b2;" dir="ltr">${email || 'לא הוזן'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">סוג חשבון</td>
                <td style="padding: 10px 0;">
                  <span style="background: #dbeafe; color: #1d4ed8; padding: 2px 10px; border-radius: 20px; font-size: 13px;">${typeLabel}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">זמן הרשמה</td>
                <td style="padding: 10px 0; font-size: 13px; color: #475569;">${now}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center;">
            <a href="https://nituk-beclick-chat.vercel.app/admin"
               style="display: inline-block; background: linear-gradient(135deg, #0891b2, #8b5cf6); color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px;">
              פתח דאשבורד מנהל
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
            ניתוק בקליק — מערכת ניהול קהילה
          </p>
        </div>
      </div>
    `

    // ── Try Resend ────────────────────────────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'ניתוק בקליק <onboarding@resend.dev>',
          to: ADMIN_EMAIL,
          subject,
          html,
        }),
      })

      if (res.ok) {
        return NextResponse.json({ success: true, method: 'resend' })
      }
      console.error('Resend error:', await res.text())
    }

    // ── No email provider — still return success (notification logged on client) ─
    return NextResponse.json({ success: true, method: 'none' })

  } catch (err) {
    console.error('notify-registration error:', err)
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
