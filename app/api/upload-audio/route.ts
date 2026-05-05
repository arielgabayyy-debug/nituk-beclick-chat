import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

// Per-IP rate limit: 15 uploads / 60s
const uploadRateMap = new Map<string, { count: number; reset: number }>()
function checkUploadRate(ip: string): boolean {
  const now = Date.now()
  const entry = uploadRateMap.get(ip)
  if (!entry || now > entry.reset) { uploadRateMap.set(ip, { count: 1, reset: now + 60_000 }); return true }
  if (entry.count >= 15) return false
  entry.count++; return true
}

// Allowed MIME types for audio and video uploads
const ALLOWED_AUDIO = new Set([
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/mp3',
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

// Full set of MIME types the bucket must allow (covers iOS + Android + desktop)
const BUCKET_MIME_TYPES = [
  // Audio — desktop (webm/ogg) + iOS (mp4/m4a/aac) + generic
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/mp3',
  'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/x-m4a', 'audio/m4a',
  // Video — desktop (webm) + iOS (quicktime/mp4) + Android + generic
  'video/webm', 'video/mp4', 'video/quicktime', 'video/x-m4v',
  'video/avi', 'video/x-msvideo', 'video/x-matroska',
  // Fallback (some browsers send this)
  'application/octet-stream',
]

// Ensure the bucket exists and is public, and keep allowed MIME types up to date.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureBucket(supabase: any) {
  const bucketConfig = {
    public: true,
    fileSizeLimit: 20 * 1024 * 1024,
    allowedMimeTypes: BUCKET_MIME_TYPES,
  }

  const { error: createError } = await supabase.storage.createBucket('chat-audio', bucketConfig)

  if (createError) {
    if (createError.message.includes('already exists') || createError.message.includes('duplicate')) {
      // Bucket exists — update its config so MIME types stay in sync
      const { error: updateError } = await supabase.storage.updateBucket('chat-audio', bucketConfig)
      if (updateError) {
        console.warn('ensureBucket updateBucket warning:', updateError.message)
      }
    } else {
      console.warn('ensureBucket createBucket warning:', createError.message)
    }
  }
}

export async function POST(request: NextRequest) {
  // ── Rate limit ──────────────────────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkUploadRate(ip)) return NextResponse.json({ error: 'יותר מדי העלאות — נסה שוב עוד דקה' }, { status: 429 })

  // ── Auth: require valid Supabase session ────────────────────────────────
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 })

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
          'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://nituk-beclick-chat.vercel.app',
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
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://nituk-beclick-chat.vercel.app',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
