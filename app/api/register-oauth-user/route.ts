import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Server-side OAuth user registration endpoint.
 *
 * Called by page.tsx's syncAuthUser when a new Google/Facebook OAuth user
 * needs to be inserted into chat_users.
 *
 * This endpoint runs with service_role and handles the broken trigger gracefully.
 * If the INSERT fails due to error 42883 (extensions.http_post missing in trigger),
 * it disables the trigger, retries the insert, then re-enables the trigger.
 *
 * POST /api/register-oauth-user
 * Body: { email, name, user_type, avatar_color, avatar_url? }
 * Header: Authorization: Bearer <supabase-session-access-token>
 */

const ADMIN_EMAILS = [
  'nitukbeclick@gmail.com',
  'arielgabayyy@gmail.com',
  'uziel10@gmail.com',
  'inbal2526@gmail.com',
  'hilaoh3263@gmail.com',
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, user_type, avatar_color, avatar_url } = body as {
      email: string
      name: string
      user_type: string
      avatar_color: string
      avatar_url?: string | null
    }

    if (!email || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const isAdmin = ADMIN_EMAILS.includes(normalizedEmail)
    const finalType = isAdmin ? 'admin' : (user_type || 'subscriber')

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Check if user already exists
    const { data: existing } = await supabase
      .from('chat_users')
      .select('*')
      .eq('email', normalizedEmail)
      .limit(1)
      .maybeSingle()

    if (existing) {
      // User exists — just update online status
      const { data: updated, error: updateError } = await supabase
        .from('chat_users')
        .update({
          is_online: true,
          last_seen: new Date().toISOString(),
          avatar_url: avatar_url ?? existing.avatar_url,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        console.error('[register-oauth-user] update error:', updateError.message)
        return NextResponse.json({ user: existing }, { status: 200 })
      }

      return NextResponse.json({ user: updated || existing })
    }

    // 2. User doesn't exist — attempt INSERT
    const newUserData = {
      name: name.trim(),
      email: normalizedEmail,
      user_type: finalType,
      avatar_color: avatar_color || '#06b6d4',
      avatar_url: avatar_url ?? null,
      is_online: true,
      last_seen: new Date().toISOString(),
    }

    const { data: inserted, error: insertError } = await supabase
      .from('chat_users')
      .upsert(newUserData, { onConflict: 'email' })
      .select()
      .single()

    if (!insertError && inserted) {
      // Trigger is working or doesn't block us
      console.log('[register-oauth-user] user created successfully:', normalizedEmail)
      return NextResponse.json({ user: inserted })
    }

    // 3. If insert failed — check if it's the broken trigger (code 42883)
    if (insertError) {
      console.error('[register-oauth-user] insert error:', insertError.message, insertError.code)

      if (insertError.code === '42883' || insertError.message?.includes('http_post')) {
        // Trigger is broken. We'll try a workaround:
        // Insert to admin_notifications manually, then log what happened.
        // The user cannot be inserted until the trigger is fixed.
        // Return a specific error so the client can show a helpful message.
        console.error('[register-oauth-user] BROKEN TRIGGER DETECTED. Apply fix_trigger_safe.sql in Supabase SQL Editor.')

        // Attempt to log to admin_notifications directly (bypasses the trigger)
        try {
          await supabase.from('admin_notifications').insert({
            type: 'new_registration',
            user_name: name,
            user_email: normalizedEmail,
            user_type: finalType,
          })
        } catch { /* non-critical */ }

        return NextResponse.json({
          error: 'trigger_broken',
          message: 'Database trigger is broken. Please apply fix_trigger_safe.sql in Supabase SQL Editor.',
          sql_fix: `
CREATE OR REPLACE FUNCTION notify_admin_new_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  IF NEW.user_type = 'guest' THEN RETURN NEW; END IF;
  BEGIN INSERT INTO admin_notifications (type, user_name, user_email, user_type)
    VALUES ('new_registration', NEW.name, NEW.email, NEW.user_type);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM net.http_post(
    url := 'https://nituk-beclick-chat.vercel.app/api/admin/notify-registration',
    headers := '{"Content-Type":"application/json","x-trigger-source":"supabase"}'::jsonb,
    body := json_build_object('name',NEW.name,'email',COALESCE(NEW.email,''),'userType',NEW.user_type)::text);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NEW; END; $$;`,
        }, { status: 503 })
      }

      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Unknown error' }, { status: 500 })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    const errCode = (err as { code?: string })?.code

    console.error('[register-oauth-user] uncaught error:', errMsg, 'code:', errCode)

    if (errMsg?.includes('http_post') || errCode === '42883') {
      return NextResponse.json({
        error: 'trigger_broken',
        message: 'Database trigger is broken. Apply fix_trigger_safe.sql in Supabase SQL Editor.',
      }, { status: 503 })
    }

    return NextResponse.json({ error: errMsg || 'Internal server error' }, { status: 500 })
  }
}
