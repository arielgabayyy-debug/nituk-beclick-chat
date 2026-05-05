import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminRequest } from '@/lib/admin-auth'

// Allowlist of buckets admins can access
const ALLOWED_BUCKETS = new Set(['chat-audio', 'chat-images'])

// Max files deletable in a single request
const MAX_DELETE_FILES = 50

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  // Server-side admin verification (defense in depth beyond middleware)
  const auth = await verifyAdminRequest(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const bucket = searchParams.get('bucket') || 'chat-audio'

  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: 'Invalid bucket name' }, { status: 400 })
  }

  const { data, error } = await admin().storage.from(bucket).list('', {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  })

  if (error) { console.error('[storage/list]', error); return NextResponse.json({ error: 'Failed to list storage files' }, { status: 500 }) }

  const files = (data || []).map(f => ({
    name: f.name,
    size: f.metadata?.size ?? 0,
    type: f.metadata?.mimetype ?? '',
    created_at: f.created_at,
    url: admin().storage.from(bucket).getPublicUrl(f.name).data.publicUrl,
  }))

  return NextResponse.json({ files })
}

export async function DELETE(req: Request) {
  // Server-side admin verification (defense in depth beyond middleware)
  const auth = await verifyAdminRequest(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { bucket, names } = body as { bucket?: unknown; names?: unknown }

  // Validate bucket
  if (!bucket || typeof bucket !== 'string' || !ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: 'Invalid bucket name' }, { status: 400 })
  }

  // Validate names
  if (!Array.isArray(names) || names.length === 0) {
    return NextResponse.json({ error: 'No file names provided' }, { status: 400 })
  }
  if (names.length > MAX_DELETE_FILES) {
    return NextResponse.json({ error: `Cannot delete more than ${MAX_DELETE_FILES} files at once` }, { status: 400 })
  }
  // Validate each name is a non-empty string with no path traversal
  for (const name of names) {
    if (typeof name !== 'string' || !name.trim() || name.includes('..') || name.includes('/')) {
      return NextResponse.json({ error: 'Invalid file name in request' }, { status: 400 })
    }
  }

  const safeNames = (names as string[]).map(n => n.trim())
  const supabase = admin()

  const { error } = await supabase.storage.from(bucket).remove(safeNames)
  if (error) { console.error('[storage/delete]', error); return NextResponse.json({ error: 'Failed to delete files' }, { status: 500 }) }

  // Audit log
  try {
    await supabase.from('admin_audit_log').insert({
      action: 'delete_storage_files',
      target_type: 'storage',
      details: { bucket, files: safeNames, count: safeNames.length, admin_email: auth.email },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, deleted: safeNames.length })
}
