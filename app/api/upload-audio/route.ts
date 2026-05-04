import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Allowed MIME types for audio and video uploads
const ALLOWED_AUDIO = new Set([
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg',
  'audio/aac', 'audio/wav', 'audio/x-m4a', 'audio/m4a', 'audio/x-wav',
])
const ALLOWED_VIDEO = new Set([
  'video/webm', 'video/mp4', 'video/quicktime', 'video/avi',
  'video/x-msvideo', 'video/x-matroska',
])

function deriveExt(file: File): string {
  const t   = file.type
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (t.includes('webm'))            return 'webm'
  if (t.includes('ogg'))             return 'ogg'
  if (t.includes('mp4') || t.includes('m4a')) return 'mp4'
  if (t.includes('quicktime') || ext === 'mov') return 'mov'
  if (t.includes('avi') || ext === 'avi')       return 'avi'
  if (t.includes('video'))           return 'webm'
  if (t.includes('audio'))           return 'mp4'
  return ext || 'mp4'
}

// Ensure the bucket exists and is public (idempotent)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureBucket(supabase: any) {
  const { error } = await supabase.storage.createBucket('chat-audio', {
    public: true,
    fileSizeLimit: 20 * 1024 * 1024,
    allowedMimeTypes: [
      'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg',
      'audio/aac', 'audio/wav', 'audio/x-m4a', 'audio/m4a',
      'video/webm', 'video/mp4', 'video/quicktime',
      'video/avi', 'video/x-msvideo', 'application/octet-stream',
    ],
  })
  // Ignore "already exists" error
  if (error && !error.message.includes('already exists') && !error.message.includes('duplicate')) {
    console.warn('ensureBucket warning:', error.message)
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'no file' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'הקובץ גדול מדי (מקסימום 20MB)' }, { status: 400 })
    }

    // Accept audio + video (video recorder also uses this route)
    const isAudio = ALLOWED_AUDIO.has(file.type)
    const isVideo = ALLOWED_VIDEO.has(file.type)
    if (!isAudio && !isVideo && file.type !== '' && file.type !== 'application/octet-stream') {
      return NextResponse.json({ error: `סוג קובץ לא נתמך: ${file.type}` }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Make sure bucket exists (no-op if already created)
    await ensureBucket(supabase)

    const ext  = deriveExt(file)
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const bytes = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('chat-audio')
      .upload(path, bytes, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '31536000',   // 1 year — immutable once uploaded
        upsert: false,
      })

    if (uploadError) {
      console.error('upload-audio storage error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Public URL — works immediately because bucket is public
    const { data: { publicUrl } } = supabase.storage
      .from('chat-audio')
      .getPublicUrl(path)

    return NextResponse.json(
      { url: publicUrl, path },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
      }
    )
  } catch (e) {
    console.error('upload-audio unexpected error:', e)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
