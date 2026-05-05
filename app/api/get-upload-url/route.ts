/**
 * Edge-runtime endpoint that generates a Supabase signed upload URL.
 *
 * WHY: The current upload flow sends files through Vercel (1700ms cold, 800ms warm).
 * With this endpoint:
 *   1. Client calls this (edge = ~50ms globally) → gets signed URL
 *   2. Client uploads file DIRECTLY to Supabase Storage (no Vercel middleman)
 *   3. Total upload latency = ~50ms auth + transfer time  (was: 1700ms + transfer)
 *
 * Works for: voice, video, image uploads.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'edge'

const ALLOWED_BUCKETS = new Set(['chat-audio', 'chat-images'])

// Extension → bucket mapping
const BUCKET_MAP: Record<string, string> = {
  // audio
  'm4a': 'chat-audio', 'mp3': 'chat-audio', 'ogg': 'chat-audio',
  'wav': 'chat-audio', 'webm-audio': 'chat-audio', 'aac': 'chat-audio',
  // video
  'mp4': 'chat-audio', 'mov': 'chat-audio', 'webm': 'chat-audio',
  // image
  'jpg': 'chat-images', 'jpeg': 'chat-images', 'png': 'chat-images',
  'gif': 'chat-images', 'webp': 'chat-images', 'heic': 'chat-images',
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth: Supabase session OR X-Chat-User-Id header ──────────────
    let authed = false

    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (user) authed = true

    // Fallback: guest users pass their chat_user_id
    if (!authed) {
      const chatUserId = req.headers.get('x-chat-user-id')
      if (chatUserId && /^[0-9a-f-]{36}$/i.test(chatUserId)) {
        // Verify against DB (service role)
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
        const { data: cu } = await sb
          .from('chat_users')
          .select('id, user_type')
          .eq('id', chatUserId)
          .maybeSingle()
        if (cu && cu.user_type !== 'blocked') authed = true
      }
    }

    if (!authed) {
      return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 })
    }

    // ── Parse request ──────────────────────────────────────────────────
    const { filename, mimeType } = await req.json() as {
      filename?: string
      mimeType?: string
    }
    if (!filename || !mimeType) {
      return NextResponse.json({ error: 'חסר filename או mimeType' }, { status: 400 })
    }

    // Derive extension from MIME (never trust client filename extension)
    let ext = ''
    if (mimeType.includes('m4a') || mimeType.includes('x-m4a')) ext = 'm4a'
    else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) ext = 'mp3'
    else if (mimeType.includes('ogg')) ext = 'ogg'
    else if (mimeType.includes('wav')) ext = 'wav'
    else if (mimeType.includes('aac')) ext = 'aac'
    else if (mimeType.includes('webm') && mimeType.includes('audio')) ext = 'webm-audio'
    else if (mimeType.includes('webm')) ext = 'webm'
    else if (mimeType.includes('mp4') || mimeType.includes('m4v')) ext = 'mp4'
    else if (mimeType.includes('quicktime') || mimeType.includes('mov')) ext = 'mov'
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg'
    else if (mimeType.includes('png')) ext = 'png'
    else if (mimeType.includes('gif')) ext = 'gif'
    else if (mimeType.includes('webp')) ext = 'webp'
    else if (mimeType.includes('heic') || mimeType.includes('heif')) ext = 'heic'
    else {
      return NextResponse.json({ error: `סוג קובץ לא נתמך: ${mimeType}` }, { status: 400 })
    }

    const bucket = BUCKET_MAP[ext]
    if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'bucket לא נתמך' }, { status: 400 })
    }

    // Unique storage path
    const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext === 'webm-audio' ? 'webm' : ext}`

    // ── Generate signed upload URL (service role) ─────────────────────
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await sb.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath, { upsert: false })

    if (error || !data) {
      console.error('[get-upload-url]', error?.message)
      return NextResponse.json({ error: 'שגיאה ביצירת URL העלאה' }, { status: 500 })
    }

    // Build the public URL the client will use after upload
    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl,
      bucket,
    })
  } catch (err) {
    console.error('[get-upload-url] unexpected:', err)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
