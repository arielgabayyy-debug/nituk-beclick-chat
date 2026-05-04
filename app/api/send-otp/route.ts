// Auth is handled client-side via Supabase Auth (supabase.auth.signInWithOtp)
// This route is no longer used.
import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ error: 'Deprecated — use Supabase Auth client-side' }, { status: 410 })
}
