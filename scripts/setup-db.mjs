import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ltwyduffgrbenghdzbji.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0d3lkdWZmZ3JiZW5naGR6YmppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc1MzE4NCwiZXhwIjoyMDkzMzI5MTg0fQ.sjePfOvAGM59bA1kgYrBMpAcGfwG1ADFnzbwDFq4Ibk'
)

// Test by inserting and checking otp_codes
async function main() {
  console.log('בודק חיבור ל-Supabase...')

  // Check what tables exist
  const { data, error } = await supabase.from('chat_users').select('count').limit(1)
  if (error) {
    console.error('שגיאת חיבור:', error.message)
  } else {
    console.log('✅ חיבור תקין!')
  }

  // Try otp_codes
  const { error: otpError } = await supabase.from('otp_codes').select('*').limit(1)
  if (otpError) {
    console.log('❌ טבלת otp_codes חסרה - צריך ליצור ב-Supabase SQL Editor')
  } else {
    console.log('✅ טבלת otp_codes קיימת')
  }

  // Try deal_votes
  const { error: dealError } = await supabase.from('deal_votes').select('*').limit(1)
  if (dealError) {
    console.log('❌ טבלת deal_votes חסרה')
  } else {
    console.log('✅ טבלת deal_votes קיימת')
  }

  // Try message_upvotes
  const { error: upvoteError } = await supabase.from('message_upvotes').select('*').limit(1)
  if (upvoteError) {
    console.log('❌ טבלת message_upvotes חסרה')
  } else {
    console.log('✅ טבלת message_upvotes קיימת')
  }

  // Try success_stories
  const { error: storiesError } = await supabase.from('success_stories').select('*').limit(1)
  if (storiesError) {
    console.log('❌ טבלת success_stories חסרה')
  } else {
    console.log('✅ טבלת success_stories קיימת')
  }
}

main()
