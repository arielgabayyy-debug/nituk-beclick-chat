-- ============================================================
-- FIX: Replace broken trigger that uses extensions.http_post
-- (pg_net not installed / not accessible as extensions.http_post)
--
-- Run this in Supabase SQL Editor → https://supabase.com/dashboard
-- Project: ltwyduffgrbenghdzbji → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION notify_admin_new_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip guests — only notify for subscribers / newsletter / admins
  IF NEW.user_type = 'guest' THEN
    RETURN NEW;
  END IF;

  -- Log to admin_notifications table (reliable, synchronous)
  BEGIN
    INSERT INTO admin_notifications (type, user_name, user_email, user_type)
    VALUES ('new_registration', NEW.name, NEW.email, NEW.user_type);
  EXCEPTION WHEN OTHERS THEN
    -- table might not exist yet, ignore silently
    NULL;
  END;

  -- HTTP notification is best-effort ONLY — NEVER blocks the insert
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
    -- net.http_post unavailable (pg_net not enabled) — continue silently
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Ensure the trigger still exists and is attached
DROP TRIGGER IF EXISTS on_new_user_registration ON chat_users;

CREATE TRIGGER on_new_user_registration
  AFTER INSERT ON chat_users
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_registration();
