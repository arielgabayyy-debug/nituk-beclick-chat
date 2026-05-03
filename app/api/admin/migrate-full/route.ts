import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'

const SECRET = 'nituk_migrate_2026'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Prefer non-pooling URL for DDL (transactions, DDL need session mode)
  const dbUrl =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL

  if (!dbUrl) {
    return NextResponse.json({
      error: 'No database URL found',
      tried: ['POSTGRES_URL_NON_POOLING', 'SUPABASE_DB_URL', 'DATABASE_URL', 'POSTGRES_URL'],
      env_keys: Object.keys(process.env).filter(k =>
        k.includes('POSTGRES') || k.includes('DATABASE') || k.includes('SUPABASE_DB')
      ),
    }, { status: 500 })
  }

  const sql = readFileSync(
    join(process.cwd(), 'supabase', 'migration_full.sql'),
    'utf-8'
  )

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()

    // Split on semicolons that end a statement (skip comments and empty lines)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    const results: { sql: string; ok: boolean; error?: string }[] = []

    for (const stmt of statements) {
      const preview = stmt.slice(0, 80).replace(/\s+/g, ' ')
      try {
        await client.query(stmt)
        results.push({ sql: preview, ok: true })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        // Ignore "already exists" type errors — migration is idempotent
        if (
          message.includes('already exists') ||
          message.includes('does not exist') && message.includes('DROP')
        ) {
          results.push({ sql: preview, ok: true })
        } else {
          results.push({ sql: preview, ok: false, error: message })
        }
      }
    }

    const failed = results.filter(r => !r.ok)
    return NextResponse.json({
      success: failed.length === 0,
      total: results.length,
      failed: failed.length,
      errors: failed,
    })
  } finally {
    await client.end()
  }
}
