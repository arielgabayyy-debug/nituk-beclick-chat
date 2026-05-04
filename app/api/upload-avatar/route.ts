import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'נא להעלות קובץ' },
        { status: 400 }
      )
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'נא להעלות קובץ תמונה בלבד' },
        { status: 400 }
      )
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'גודל הקובץ המקסימלי הוא 2MB' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if user is a subscriber
    const { data: user, error: userError } = await supabase
      .from('chat_users')
      .select('user_type')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'משתמש לא נמצא' },
        { status: 404 }
      )
    }

    if (user.user_type !== 'subscriber' && user.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'רק מנויים יכולים להעלות תמונת פרופיל' },
        { status: 403 }
      )
    }

    // Convert file to base64 for storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    // Update user avatar_url
    const { error: updateError } = await supabase
      .from('chat_users')
      .update({ avatar_url: base64 })
      .eq('id', userId)

    if (updateError) {
      console.error('[v0] Upload error:', updateError)
      return NextResponse.json(
        { error: 'שגיאה בשמירת התמונה' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, avatar_url: base64, message: 'התמונה הועלתה בהצלחה!' },
      { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } }
    )

  } catch (error) {
    console.error('[v0] Upload error:', error)
    return NextResponse.json(
      { error: 'שגיאה בהעלאת התמונה' },
      { status: 500 }
    )
  }
}
