import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = ['nitukbeclick@gmail.com', 'arielgabayyy@gmail.com', 'uziel10@gmail.com', 'inbal2526@gmail.com']

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const returnTo = searchParams.get('return') || origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const user = data.user
      const email = user.email?.toLowerCase()
      if (!email) return NextResponse.redirect(`${origin}/?oauth=success`)

      const isAdmin = ADMIN_EMAILS.includes(email)
      const meta = user.user_metadata || {}

      // Name: prefer OAuth profile, then stored display_name, then email prefix
      const name = meta.full_name || meta.name || meta.display_name || email.split('@')[0]
      const avatarUrl = meta.avatar_url || meta.picture || null
      const avatarColor = meta.avatar_color || '#06b6d4'

      // Determine user type: admin > existing type > intended_type from signup
      const intendedType = (meta.intended_type as string) || 'subscriber'

      const { data: existingUser } = await supabase
        .from('chat_users')
        .select('id, user_type')
        .eq('email', email)
        .maybeSingle()

      if (existingUser) {
        // Keep existing type unless admin
        const finalType = isAdmin ? 'admin' : (existingUser.user_type ?? intendedType)
        await supabase.from('chat_users').update({
          is_online: true,
          avatar_url: avatarUrl,
          last_seen: new Date().toISOString(),
          user_type: finalType,
        }).eq('id', existingUser.id)
      } else {
        await supabase.from('chat_users').insert({
          name,
          email,
          user_type: isAdmin ? 'admin' : intendedType,
          avatar_color: avatarColor,
          avatar_url: avatarUrl,
          is_online: true,
        })
      }
    }
  }

  const redirectUrl = returnTo.startsWith('http') ? returnTo : `${origin}/?oauth=success`
  return NextResponse.redirect(redirectUrl)
}
