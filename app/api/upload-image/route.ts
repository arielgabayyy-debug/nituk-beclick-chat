import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'chat-images'
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'לא נבחרה תמונה' }, { status: 400 })
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'סוג קובץ לא נתמך' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'התמונה גדולה מדי (מקסימום 10MB)' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Unique path per upload
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const bytes = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        cacheControl: '31536000', // 1 year
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'שגיאה בהעלאה' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('upload-image error:', err)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
