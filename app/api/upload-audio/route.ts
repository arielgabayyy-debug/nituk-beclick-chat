import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'גדול מדי' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const t = file.type
    const ext = t.includes('webm') ? 'webm' : t.includes('ogg') ? 'ogg' : t.includes('mp4') || t.includes('m4a') ? 'mp4' : t.includes('video') ? 'webm' : 'mp4'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const bytes = await file.arrayBuffer()
    const { error } = await supabase.storage.from('chat-audio').upload(path, bytes, {
      contentType: file.type,
      cacheControl: '31536000',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data: { publicUrl } } = supabase.storage.from('chat-audio').getPublicUrl(path)
    return NextResponse.json({ url: publicUrl })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
