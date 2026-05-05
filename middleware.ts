import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAILS = [
  'arielgabayyy@gmail.com',
  'nitukbeclick@gmail.com',
  'uziel10@gmail.com',
  'inbal2526@gmail.com',
  'hilaoh3263@gmail.com',
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  // ── Protect /api/admin/* routes ────────────────────────────────────────
  if (request.nextUrl.pathname.startsWith('/api/admin/')) {
    const path = request.nextUrl.pathname

    // These routes authenticate themselves — skip session check
    const selfAuthRoutes = [
      '/api/admin/login',
      '/api/admin/notify-registration', // called by use-chat.ts + Supabase trigger
      '/api/admin/mfa-verify',          // MFA — auth checked inside route
      '/api/admin/mfa-qr',              // MFA QR — auth checked inside route
      '/api/admin/mfa-status',          // MFA status — auth checked inside route
    ]

    if (!selfAuthRoutes.some(r => path.startsWith(r))) {
      const email = user?.email?.toLowerCase() || ''
      if (!user || !ADMIN_EMAILS.includes(email)) {
        return NextResponse.json(
          { error: 'Unauthorized — admin access required' },
          { status: 401 }
        )
      }
    }
  }

  // ── Note on /admin page ────────────────────────────────────────────────
  // The /admin page is intentionally not server-redirected because users
  // authenticate via Google OAuth (client-side). The page renders a login
  // button for unauthenticated users. All sensitive data is fetched via
  // /api/admin/* routes which ARE protected by the middleware above.
  // This is a deliberate UX decision, not a security gap.

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run middleware on all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
