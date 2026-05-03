import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const returnTo = searchParams.get('return') || `${origin}/?oauth=success`

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const user = data.user
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'משתמש'
      const email = user.email
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null

      if (email) {
        const { data: existingUser } = await supabase
          .from('chat_users')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        if (!existingUser) {
          await supabase.from('chat_users').insert({
            name, email,
            user_type: 'subscriber',
            avatar_color: '#06b6d4',
            avatar_url: avatarUrl,
            is_online: true,
          })
        } else {
          await supabase.from('chat_users').update({
            is_online: true,
            avatar_url: avatarUrl,
            last_seen: new Date().toISOString(),
          }).eq('id', existingUser.id)
        }
      }
    }
  }

  // אם יש return URL - חזור לשם (למשל WordPress), אחרת לאפליקציה
  const redirectUrl = returnTo.startsWith('http')
    ? returnTo
    : `${origin}/?oauth=success`

  return NextResponse.redirect(redirectUrl)
}
