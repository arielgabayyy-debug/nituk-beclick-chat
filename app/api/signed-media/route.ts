import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Returns a 1-hour signed URL for a Supabase Storage object.
// Called by voice-message and video players when the public URL fails.
//
// GET /api/signed-media?url=https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
// → { signedUrl: "https://..." }

export const runtime = 'nodejs'

// Extract bucket + object path from a Supabase public URL
function parseSupabaseUrl(raw: string): { bucket: string; path: string } | null {
  try {
    // Pattern: /storage/v1/object/public/<bucket>/<path...>
    //      or: /storage/v1/object/sign/<bucket>/<path...>
    const match = raw.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/)
    if (!match) return null
    return { bucket: match[1], path: match[2] }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }

    // Security: only proxy our own Supabase project
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase/)?.[1]
    if (!projectRef || !url.includes(`${projectRef}.supabase.co`)) {
      return NextResponse.json({ error: 'Invalid url' }, { status: 403 })
    }

    const parsed = parseSupabaseUrl(url)
    if (!parsed) {
      return NextResponse.json({ error: 'Could not parse storage path' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First try: public URL (works if bucket is public)
    const { data: { publicUrl } } = supabase.storage
      .from(parsed.bucket)
      .getPublicUrl(parsed.path)

    // Second: create a signed URL valid for 1 hour as a reliable fallback
    const { data: signedData, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 3600)

    if (error || !signedData?.signedUrl) {
      // Fallback: return the public URL anyway, client can try it
      return NextResponse.json({ signedUrl: publicUrl })
    }

    return NextResponse.json(
      { signedUrl: signedData.signedUrl },
      {
        headers: {
          'Cache-Control': 'private, max-age=1800', // cache for 30 min (URL valid 60)
        },
      }
    )
  } catch (err) {
    console.error('signed-media error:', err)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
