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

  // ── Protect /admin page ────────────────────────────────────────────────
  // (client-side also checks, this is the server-side layer)
  if (request.nextUrl.pathname === '/admin') {
    const email = user?.email?.toLowerCase() || ''
    if (!user || !ADMIN_EMAILS.includes(email)) {
      // Don't redirect — let the client-side Google login handle it
      // (the page shows a login button, not a redirect loop)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run middleware on all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
