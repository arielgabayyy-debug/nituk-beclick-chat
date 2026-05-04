import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const bucket = searchParams.get('bucket') || 'chat-audio'

  const { data, error } = await admin().storage.from(bucket).list('', {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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
  const { bucket, names } = await req.json() as { bucket: string; names: string[] }
  if (!names?.length) return NextResponse.json({ error: 'no names' }, { status: 400 })

  const { error } = await admin().storage.from(bucket).remove(names)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: names.length })
}
