import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// One-time migration test endpoint — delete after use
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Test if columns exist by trying an upsert with them
  const { error: testError } = await supabase
    .from('otp_codes')
    .upsert({
      email: 'migration-test@example.com',
      code: '000000',
      expires_at: new Date(Date.now() - 1000).toISOString(),
      attempts: 0,
      last_sent_at: new Date().toISOString(),
    }, { onConflict: 'email' })

  if (testError) {
    return NextResponse.json({
      success: false,
      error: testError.message,
      action: 'Run this SQL in Supabase SQL Editor:\nALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;\nALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ DEFAULT NOW();'
    })
  }

  // Clean up
  await supabase.from('otp_codes').delete().eq('email', 'migration-test@example.com')

  return NextResponse.json({ success: true, message: 'All columns OK' })
}
