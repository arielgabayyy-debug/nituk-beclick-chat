-- ============================================================
-- Registration notification trigger
-- Run this once in Supabase SQL Editor
-- ============================================================

-- 1. Admin notifications log table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  type        text        NOT NULL DEFAULT 'new_registration',
  user_name   text,
  user_email  text,
  user_type   text,
  is_read     boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can read / update all notifications
CREATE POLICY "admins_all" ON admin_notifications
  FOR ALL USING (true);

-- Index for unread count queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread
  ON admin_notifications (is_read, created_at DESC);

-- ---------------------------------------------------------------
-- 2. Enable pg_net extension (HTTP calls from within Postgres)
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- ---------------------------------------------------------------
-- 3. Trigger function — fires on every new chat_users INSERT
-- ---------------------------------------------------------------
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

  -- Always log to admin_notifications (instant, reliable)
  INSERT INTO admin_notifications (type, user_name, user_email, user_type)
  VALUES ('new_registration', NEW.name, NEW.email, NEW.user_type);

  -- Also call the Next.js API to send an email (async / best-effort)
  -- The API uses RESEND_API_KEY when present, otherwise just logs
  PERFORM extensions.http_post(
    url     := 'https://nituk-beclick-chat.vercel.app/api/admin/notify-registration',
    headers := '{"Content-Type": "application/json", "x-trigger-source": "supabase"}'::jsonb,
    body    := json_build_object(
                 'name',     NEW.name,
                 'email',    COALESCE(NEW.email, ''),
                 'userType', NEW.user_type
               )::text
  );

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------
-- 4. Attach trigger to chat_users
-- ---------------------------------------------------------------
DROP TRIGGER IF EXISTS on_new_user_registration ON chat_users;

CREATE TRIGGER on_new_user_registration
  AFTER INSERT ON chat_users
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_registration();
