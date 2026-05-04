import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * One-time admin endpoint to fix the broken chat_users INSERT trigger.
 * The trigger calls extensions.http_post which doesn't exist (pg_net not enabled).
 * This replaces it with a version that wraps the HTTP call in EXCEPTION so it
 * never blocks user registration.
 *
 * Call: POST /api/admin/fix-trigger
 * with header: x-admin-secret: <SUPABASE_SERVICE_ROLE_KEY>
 */
export async function POST(request: Request) {
  const secret = request.headers.get('x-admin-secret')
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Use rpc to execute the DDL fix
  // We create a helper function first, then call it, then drop it
  const fixSql = `
    CREATE OR REPLACE FUNCTION notify_admin_new_registration()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      IF NEW.user_type = 'guest' THEN
        RETURN NEW;
      END IF;

      BEGIN
        INSERT INTO admin_notifications (type, user_name, user_email, user_type)
        VALUES ('new_registration', NEW.name, NEW.email, NEW.user_type);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      BEGIN
        PERFORM net.http_post(
          url     := 'https://nituk-beclick-chat.vercel.app/api/admin/notify-registration',
          headers := '{"Content-Type": "application/json", "x-trigger-source": "supabase"}'::jsonb,
          body    := json_build_object(
                       'name',     NEW.name,
                       'email',    COALESCE(NEW.email, ''),
                       'userType', NEW.user_type
                     )::text
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      RETURN NEW;
    END;
    $func$;
  `

  // Unfortunately we can't run DDL via PostgREST directly.
  // We use the pg connection string approach via supabase.rpc if available,
  // or return the SQL for manual application.

  // Try to call any existing exec function
  const { error: rpcError } = await supabase.rpc('exec_sql', { sql: fixSql })

  if (rpcError && rpcError.code === 'PGRST202') {
    // No exec_sql function — return the SQL to apply manually
    return NextResponse.json({
      success: false,
      message: 'No exec_sql RPC available. Apply this SQL manually in Supabase SQL Editor:',
      sql: fixSql,
    })
  }

  if (rpcError) {
    return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Trigger fixed successfully' })
}
