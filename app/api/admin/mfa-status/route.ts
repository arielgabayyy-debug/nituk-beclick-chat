import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { validateMFACookie } from '@/lib/admin-mfa'

const ADMIN_EMAILS = [
  'nitukbeclick@gmail.com',
  'arielgabayyy@gmail.com',
  'uziel10@gmail.com',
  'inbal2526@gmail.com',
  'hilaoh3263@gmail.com',
]

/**
 * GET /api/admin/mfa-status
 * Returns { verified: boolean } based on whether the admin_mfa cookie is valid.
 * Used on page load to restore MFA session without requiring re-verification.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return NextResponse.json({ verified: false })
    }

    const cookieStore = await cookies()
    const mfaCookie = cookieStore.get('admin_mfa')?.value
    const verified = validateMFACookie(mfaCookie, user.email)

    return NextResponse.json({ verified })
  } catch {
    return NextResponse.json({ verified: false })
  }
}
