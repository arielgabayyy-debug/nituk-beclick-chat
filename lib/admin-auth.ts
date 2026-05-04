import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = [
  'arielgabayyy@gmail.com',
  'nitukbeclick@gmail.com',
  'uziel10@gmail.com',
  'inbal2526@gmail.com',
  'hilaoh3263@gmail.com',
]

/**
 * Verify the request comes from an authenticated admin.
 *
 * How it works:
 *  1. Read the `Authorization: Bearer <access_token>` header sent by the
 *     admin dashboard's supabase client (it attaches it automatically).
 *  2. Use the service-role client to look up the user from the token.
 *  3. Check the user's email is in the ADMIN_EMAILS list.
 *
 * Returns { ok: true, email } on success, or { ok: false, error } on failure.
 */
export async function verifyAdminRequest(
  request: Request
): Promise<{ ok: true; email: string } | { ok: false; error: string; status: number }> {
  const auth = request.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''

  if (!token) {
    return { ok: false, error: 'Missing Authorization header', status: 401 }
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user?.email) {
      return { ok: false, error: 'Invalid or expired token', status: 401 }
    }

    const email = user.email.toLowerCase()
    if (!ADMIN_EMAILS.includes(email)) {
      return { ok: false, error: 'Not authorized', status: 403 }
    }

    return { ok: true, email }
  } catch {
    return { ok: false, error: 'Auth verification failed', status: 500 }
  }
}
