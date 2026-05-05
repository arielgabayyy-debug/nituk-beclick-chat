/**
 * Direct-to-Supabase upload utility.
 *
 * Old flow: client → Vercel API (1700ms cold / 800ms warm) → Supabase Storage
 * New flow: client → /api/get-upload-url (edge, ~50ms) → PUT directly to Supabase
 *
 * Eliminates Vercel as the file middleman → upload time = ~50ms auth + raw transfer.
 */
import { createClient } from '@/lib/supabase/client'

export interface UploadResult {
  url: string
  error?: string
}

/**
 * Upload a Blob/File directly to Supabase Storage via a signed URL.
 *
 * @param file      The file/blob to upload
 * @param filename  Logical filename used to derive the content-type (e.g. "voice.m4a")
 * @returns         { url } on success or { url: '', error } on failure
 */
export async function uploadDirectToSupabase(
  file: Blob | File,
  filename: string
): Promise<UploadResult> {
  const chatUserId = typeof window !== 'undefined'
    ? localStorage.getItem('chat_user_id')
    : null

  const mimeType = file.type || guessMimeType(filename)

  // ── Step 1: get signed upload URL (edge function, ~50ms) ─────────────────
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (chatUserId) headers['x-chat-user-id'] = chatUserId

  let urlData: { signedUrl: string; token: string; path: string; publicUrl: string; bucket: string }
  try {
    const urlRes = await fetch('/api/get-upload-url', {
      method: 'POST',
      headers,
      body: JSON.stringify({ filename, mimeType }),
    })
    if (!urlRes.ok) {
      const err = await urlRes.json().catch(() => ({}))
      return { url: '', error: (err as { error?: string }).error || 'שגיאה בקבלת URL' }
    }
    urlData = await urlRes.json()
  } catch {
    return { url: '', error: 'שגיאת רשת - לא ניתן ליצור URL' }
  }

  const { token, path, publicUrl, bucket } = urlData

  // ── Step 2: upload directly to Supabase Storage (no Vercel middleman) ────
  try {
    const supabase = createClient()
    const { error } = await supabase.storage
      .from(bucket)
      .uploadToSignedUrl(path, token, file, {
        contentType: mimeType,
        upsert: false,
      })

    if (error) {
      return { url: '', error: error.message }
    }
  } catch {
    return { url: '', error: 'שגיאה בהעלאה לשרת' }
  }

  return { url: publicUrl }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const MAP: Record<string, string> = {
    'm4a':  'audio/mp4',
    'mp3':  'audio/mpeg',
    'aac':  'audio/aac',
    'ogg':  'audio/ogg',
    'wav':  'audio/wav',
    'webm': 'audio/webm',
    'mp4':  'video/mp4',
    'mov':  'video/quicktime',
    'jpg':  'image/jpeg',
    'jpeg': 'image/jpeg',
    'png':  'image/png',
    'gif':  'image/gif',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'heif': 'image/heic',
  }
  return MAP[ext] ?? 'application/octet-stream'
}
