// This route is kept for backward compatibility.
// The login form now calls Supabase Auth directly (client-side).
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Use Supabase Auth directly' }, { status: 410 })
}
