import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

// Admin login with encrypted password verification
export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'נא להזין שם משתמש וסיסמה' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get admin credentials from database
    const { data: admin, error } = await supabase
      .from('admin_credentials')
      .select('id, username, password_hash')
      .eq('username', username.toLowerCase())
      .single()

    if (error || !admin) {
      return NextResponse.json(
        { error: 'שם משתמש או סיסמה שגויים' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash)

    if (!isValid) {
      return NextResponse.json(
        { error: 'שם משתמש או סיסמה שגויים' },
        { status: 401 }
      )
    }

    // Update last login time
    await supabase
      .from('admin_credentials')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id)

    // Generate a simple session token
    const sessionToken = Buffer.from(
      JSON.stringify({ 
        adminId: admin.id, 
        username: admin.username,
        timestamp: Date.now() 
      })
    ).toString('base64')

    return NextResponse.json({ 
      success: true, 
      token: sessionToken,
      message: 'התחברת בהצלחה!'
    })

  } catch (error) {
    console.error('[v0] Admin login error:', error)
    return NextResponse.json(
      { error: 'שגיאה בהתחברות' },
      { status: 500 }
    )
  }
}
