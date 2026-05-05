import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const BUCKET = 'chat-images'
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']

// Per-IP rate limit: 20 uploads / 60s
const uploadRateMap = new Map<string, { count: number; reset: number }>()
function checkUploadRate(ip: string): boolean {
  const now = Date.now()
  const entry = uploadRateMap.get(ip)
  if (!entry || now > entry.reset) { uploadRateMap.set(ip, { count: 1, reset: now + 60_000 }); return true }
  if (entry.count >= 20) return false
  entry.count++; return true
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

    if (!file) return NextResponse.json({ error: 'לא נבחרה תמונה' }, { status: 400 })
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'סוג קובץ לא נתמך' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'התמונה גדולה מדי (מקסימום 10MB)' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Ensure bucket exists and is public (no-op if already set up)
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_SIZE,
      allowedMimeTypes: ALLOWED,
    }).catch(() => { /* already exists — ignore */ })

    // Unique path per upload — derive ext from MIME type (not filename, which could be spoofed)
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
      'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
    }
    const ext = mimeToExt[file.type] || 'jpg'
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

    return NextResponse.json(
      { url: publicUrl },
      { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } }
    )
  } catch (err) {
    console.error('upload-image error:', err)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
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
