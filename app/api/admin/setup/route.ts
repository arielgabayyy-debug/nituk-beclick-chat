import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

// One-time setup to create/update admin password
// Call this once to set your secure password
export async function POST(request: Request) {
  try {
    const { setupKey, username, password } = await request.json()

    // Simple setup key protection - change this to your own secret
    if (setupKey !== process.env.ADMIN_SETUP_KEY && setupKey !== 'nituk-setup-2024') {
      return NextResponse.json(
        { error: 'מפתח הגדרה שגוי' },
        { status: 401 }
      )
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'נא להזין שם משתמש וסיסמה' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'הסיסמה חייבת להכיל לפחות 6 תווים' },
        { status: 400 }
      )
    }

    // Hash the password
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    const supabase = await createClient()

    // Upsert admin credentials
    const { error } = await supabase
      .from('admin_credentials')
      .upsert({
        username: username.toLowerCase(),
        password_hash: passwordHash,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'username'
      })

    if (error) {
      console.error('[v0] Setup error:', error)
      return NextResponse.json(
        { error: 'שגיאה ביצירת המנהל' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'המנהל נוצר בהצלחה! עכשיו תוכל להתחבר.'
    })

  } catch (error) {
    console.error('[v0] Setup error:', error)
    return NextResponse.json(
      { error: 'שגיאה בהגדרה' },
      { status: 500 }
    )
  }
}
