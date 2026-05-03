import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const ADMIN_EMAILS = ['arielgabayyy@gmail.com', 'nitukbeclick@gmail.com', 'uziel10@gmail.com', 'inbal2526@gmail.com']

export async function POST(request: Request) {
  const { subject, message, targetType, senderEmail } = await request.json() as {
    subject: string
    message: string
    targetType: 'all' | 'subscribers' | 'newsletter'
    senderEmail: string
  }

  // Verify sender is admin
  if (!ADMIN_EMAILS.includes(senderEmail)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get target users
  let query = supabase.from('chat_users').select('email, name').not('email', 'is', null)
  if (targetType === 'subscribers') {
    query = query.eq('user_type', 'subscriber')
  } else if (targetType === 'newsletter') {
    query = query.eq('user_type', 'newsletter')
  }

  const { data: users, error: usersError } = await query
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  const emails = (users || []).filter(u => u.email).map(u => u.email as string)

  if (emails.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: 'No users to send to' })
  }

  const htmlBody = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: linear-gradient(135deg, #06b6d4, #8b5cf6); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px; text-align: center;">
        <h1 style="margin: 0 0 8px; font-size: 22px;">📢 ${subject}</h1>
        <p style="margin: 0; opacity: 0.9; font-size: 14px;">מהקהילה שלנו</p>
      </div>
      <div style="background: #f9f9f9; border-radius: 12px; padding: 20px; margin-bottom: 20px; white-space: pre-wrap; line-height: 1.7; font-size: 15px;">
        ${message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}
      </div>
      <div style="text-align: center; margin-top: 24px;">
        <a href="https://nituk-beclick-chat.vercel.app" style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: white; padding: 12px 28px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 15px;">
          🚀 כנס לצ'אט
        </a>
      </div>
      <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
        קיבלת הודעה זו כי אתה חבר בקהילת חיבור וניתוק בקליק
      </p>
    </div>
  `

  let sent = 0
  let failed = 0

  // Send in batches of 50 via Resend REST API
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'נוזלטר <noreply@resend.dev>',
          to: batch,
          subject,
          html: htmlBody,
        }),
      })
      if (res.ok) { sent += batch.length } else { failed += batch.length }
    } catch {
      failed += batch.length
    }
  }

  return NextResponse.json({ success: true, sent, failed, total: emails.length })
}
