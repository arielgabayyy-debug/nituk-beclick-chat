import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAILS = ['nitukbeclick@gmail.com', 'arielgabayyy@gmail.com', 'uziel10@gmail.com', 'inbal2526@gmail.com', 'hilaoh3263@gmail.com']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    // No ?code= param — magic link may have sent tokens as hash fragment (#access_token=...)
    // Hash fragments are not visible server-side, so we return a small HTML page
    // that reads the hash client-side and forwards the tokens to page.tsx
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>מתחבר...</title></head>
      <body><p style="font-family:sans-serif;text-align:center;padding:40px">מתחבר...</p>
      <script>
        try {
          var hash = window.location.hash.substring(1);
          var params = new URLSearchParams(hash);
          var at = params.get('access_token');
          var rt = params.get('refresh_token') || '';
          if (at) {
            sessionStorage.setItem('sb_magic_tokens', JSON.stringify({ access_token: at, refresh_token: rt }));
            window.location.replace('/?oauth=magic');
          } else {
            window.location.replace('/');
          }
        } catch(e) { window.location.replace('/'); }
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('Auth callback error:', error?.message)
    return NextResponse.redirect(`${origin}/?auth_error=1`)
  }

  const user = data.user
  const email = user.email?.toLowerCase()

  if (email) {
    const isAdmin = ADMIN_EMAILS.includes(email)
    const meta = user.user_metadata || {}

    const name = meta.full_name || meta.name || meta.display_name || email.split('@')[0]
    const avatarUrl = meta.avatar_url || meta.picture || null
    const avatarColor = meta.avatar_color || '#06b6d4'

    // intended_type is stored in localStorage by login-form.tsx before OAuth redirect.
    // page.tsx reads it after ?oauth=success. Here we just default to 'subscriber'.
    const intendedType = (meta.intended_type as string) || 'subscriber'

    const { data: existingRows } = await supabase
      .from('chat_users')
      .select('id, user_type')
      .eq('email', email)
      .order('created_at', { ascending: true })
      .limit(1)
    const existingUser = existingRows?.[0] ?? null

    if (existingUser) {
      const finalType = isAdmin ? 'admin' : (existingUser.user_type ?? intendedType)
      await supabase.from('chat_users').update({
        is_online: true,
        avatar_url: avatarUrl,
        last_seen: new Date().toISOString(),
        user_type: finalType,
      }).eq('id', existingUser.id)
      // existing user — no email notification needed
    } else {
      // New user — insert
      const userType = isAdmin ? 'admin' : intendedType
      const { error: upsertError } = await supabase.from('chat_users').upsert({
        name,
        email,
        user_type: userType,
        avatar_color: avatarColor,
        avatar_url: avatarUrl,
        is_online: true,
        last_seen: new Date().toISOString(),
      }, { onConflict: 'email' })

      if (upsertError) {
        console.error('chat_users upsert error:', upsertError.message, upsertError.code)
        return NextResponse.redirect(
          `${origin}/?oauth=success&intended_type=${encodeURIComponent(intendedType)}`
        )
      }

      // ── Send admin email notification (server-side, reliable) ─────────
      if (userType !== 'guest' && userType !== 'admin') {
        try {
          await fetch(`${origin}/api/admin/notify-registration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, userType }),
          })
        } catch (notifyErr) {
          console.warn('notify-registration failed (non-fatal):', notifyErr)
        }
      }
    }
  }

  // Always redirect to /?oauth=success so page.tsx knows to check session
  return NextResponse.redirect(`${origin}/?oauth=success`)
}
