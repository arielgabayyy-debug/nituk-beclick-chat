import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * One-time endpoint: adds missing columns to Frankfurt (eu-central-1) schema.
 * Call: POST /api/admin/fix-schema
 *       Header: x-admin-secret: <SUPABASE_SERVICE_ROLE_KEY>
 *
 * Missing columns vs old project:
 *   chat_users  : level INTEGER, messages_count INTEGER
 *   user_achievements: (check schema)
 */
export async function POST(request: Request) {
  const secret = request.headers.get('x-admin-secret')?.trim()
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!secret || !svcKey || secret !== svcKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const results: Record<string, string> = {}

  // ── Strategy: try exec_sql RPC first (fastest).
  //    If not available, create a SECURITY DEFINER helper, call it, drop it.
  const alterSql = `
    ALTER TABLE chat_users
      ADD COLUMN IF NOT EXISTS level          INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS messages_count INTEGER NOT NULL DEFAULT 0;

    -- user_achievements: add 'code' column (achievement code string)
    ALTER TABLE user_achievements
      ADD COLUMN IF NOT EXISTS code TEXT;

    -- Realtime for chat_users (needed for online presence)
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_users'
      ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_users;
      END IF;
    END $$;
  `

  // Try exec_sql RPC (may exist from old setup)
  const { error: rpcErr } = await supabase.rpc('exec_sql', { sql: alterSql })

  if (!rpcErr) {
    return NextResponse.json({ success: true, method: 'exec_sql', message: 'Schema fixed via exec_sql RPC' })
  }

  if (rpcErr.code !== 'PGRST202') {
    // exec_sql exists but failed
    return NextResponse.json({ success: false, error: rpcErr.message, method: 'exec_sql' }, { status: 500 })
  }

  // exec_sql not available — use helper function trick
  const createHelperSql = `
    CREATE OR REPLACE FUNCTION _fix_schema_once()
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      ALTER TABLE chat_users
        ADD COLUMN IF NOT EXISTS level          INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS messages_count INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE user_achievements
        ADD COLUMN IF NOT EXISTS code TEXT;
      RETURN 'ok';
    END;
    $func$;
  `

  // Can't run CREATE FUNCTION via REST either, so return the SQL for manual apply
  results['exec_sql_error'] = rpcErr.message
  results['action'] = 'Apply manually in Supabase SQL Editor (Dashboard > SQL Editor)'
  results['sql'] = alterSql

  return NextResponse.json({
    success: false,
    message: 'exec_sql RPC not available — apply the SQL manually in Supabase SQL Editor',
    sql: alterSql,
    results,
  }, { status: 200 }) // 200 so the caller can read it
}

// GET: health-check — also returns what SQL to run
export async function GET(request: Request) {
  const secret = request.headers.get('x-admin-secret')?.trim()
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!secret || !svcKey || secret !== svcKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check which columns exist
  const { data, error } = await supabase
    .from('chat_users')
    .select('id, level, messages_count')
    .limit(1)

  return NextResponse.json({
    has_level: !error || !error.message.includes('level'),
    has_messages_count: !error || !error.message.includes('messages_count'),
    error: error?.message ?? null,
  })
}
