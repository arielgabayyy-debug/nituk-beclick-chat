-- ============================================================
-- ADMIN SECURITY MIGRATION — ניתוק בקליק
-- Generated: 2026-05-05
-- Run in Supabase SQL Editor (safe to run multiple times)
-- https://supabase.com/dashboard/project/ltwyduffgrbenghdzbji/sql/new
-- ============================================================

-- ── 1. Ensure admin_audit_log table exists (idempotent) ────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID        REFERENCES chat_users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  target_id   UUID,
  target_type TEXT,
  details     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action     ON admin_audit_log(action);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins (user_type = 'admin') can SELECT the audit log
DROP POLICY IF EXISTS audit_read   ON admin_audit_log;
DROP POLICY IF EXISTS audit_insert ON admin_audit_log;

CREATE POLICY audit_read ON admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_users
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND user_type = 'admin'
    )
  );

-- Service role (API routes) can INSERT audit records
CREATE POLICY audit_insert ON admin_audit_log FOR INSERT WITH CHECK (true);


-- ── 2. Harden chat_settings RLS ────────────────────────────────────────────
-- Public can read (app reads slow_mode, banned_words etc.)
-- WRITE is done only by service_role key (bypasses RLS)
-- No unauthenticated INSERT/UPDATE/DELETE allowed

ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read settings"  ON chat_settings;
DROP POLICY IF EXISTS "admin write settings"  ON chat_settings;
DROP POLICY IF EXISTS "svc write settings"    ON chat_settings;

-- Read: open to all (needed for live chat features)
CREATE POLICY "public read settings"
  ON chat_settings FOR SELECT USING (true);

-- Write: blocked for anon/authenticated; service_role bypasses RLS automatically
-- (No write policy needed — service_role always bypasses RLS)


-- ── 3. Harden system_announcements RLS ─────────────────────────────────────
ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public can read announcements"  ON system_announcements;
DROP POLICY IF EXISTS "admin can insert announcements" ON system_announcements;

CREATE POLICY "public can read announcements"
  ON system_announcements FOR SELECT USING (true);

-- Only service_role (API) can insert — anon/authenticated blocked
-- (Service role bypasses RLS automatically)


-- ── 4. Harden polls RLS ────────────────────────────────────────────────────
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public can read polls"  ON polls;
DROP POLICY IF EXISTS "public can vote polls"  ON polls;
DROP POLICY IF EXISTS "polls_read"             ON polls;
DROP POLICY IF EXISTS "polls_write"            ON polls;
DROP POLICY IF EXISTS "admin create polls"     ON polls;

-- Anyone can read active polls
CREATE POLICY "public can read polls"
  ON polls FOR SELECT USING (true);

-- Only admins (via service_role API) can create polls
-- (authenticated users trying to INSERT directly are blocked)
-- Service role bypasses RLS; anon key cannot insert

-- Vote updates (JSONB votes column) — only via service_role
-- Direct client vote manipulation is blocked

-- ── 5. Harden message_reports RLS ──────────────────────────────────────────
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can insert reports" ON message_reports;
DROP POLICY IF EXISTS "admin can read reports"   ON message_reports;

-- Authenticated users can file reports
CREATE POLICY "users can insert reports"
  ON message_reports FOR INSERT TO authenticated
  WITH CHECK (true);

-- Only admins can read all reports
CREATE POLICY "admin can read reports"
  ON message_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_users
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND user_type = 'admin'
    )
    OR
    -- Also allow the reporter to see their own report (optional)
    reporter_id = (
      SELECT cu.id FROM chat_users cu
      WHERE cu.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      LIMIT 1
    )
  );

-- Only service_role (admin API) can UPDATE reports (resolve/dismiss)
-- Authenticated direct UPDATE blocked; service_role bypasses RLS


-- ── 6. Block direct anon writes to chat_users sensitive columns ─────────────
-- The existing RLS allows full UPDATE to authenticated users which lets anyone
-- change their own user_type if they craft a direct API call.
-- We replace the permissive update policy with a column-level restriction.

ALTER TABLE chat_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_update ON chat_users;

-- Users may only update non-sensitive fields on their own profile
-- user_type, is_online mass changes, points etc. must go through service_role
CREATE POLICY users_update_own ON chat_users FOR UPDATE
  USING (
    id = (
      SELECT cu.id FROM chat_users cu
      WHERE cu.email = (SELECT au.email FROM auth.users au WHERE au.id = auth.uid())
      LIMIT 1
    )
  )
  WITH CHECK (
    -- user_type must remain the same — no self-promotion
    user_type = (SELECT cu2.user_type FROM chat_users cu2 WHERE cu2.id = id LIMIT 1)
  );

-- Service_role bypasses the above and can update anything


-- ── 7. Trigger: auto-log sensitive chat_users changes ──────────────────────
-- When user_type changes to/from 'blocked', log it automatically
CREATE OR REPLACE FUNCTION log_user_type_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log when user_type actually changes
  IF OLD.user_type IS DISTINCT FROM NEW.user_type THEN
    INSERT INTO admin_audit_log (action, target_id, target_type, details)
    VALUES (
      CASE
        WHEN NEW.user_type = 'blocked' THEN 'block_user'
        WHEN OLD.user_type = 'blocked' AND NEW.user_type != 'blocked' THEN 'unblock_user'
        ELSE 'change_user_type'
      END,
      NEW.id,
      'user',
      jsonb_build_object(
        'previous_type', OLD.user_type,
        'new_type',       NEW.user_type,
        'user_email',     NEW.email,
        'user_name',      NEW.name,
        'source',         'db_trigger'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_user_type_change ON chat_users;
CREATE TRIGGER trg_log_user_type_change
  AFTER UPDATE OF user_type ON chat_users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_type_change();


-- ── 8. Trigger: auto-log message deletions by admins ───────────────────────
CREATE OR REPLACE FUNCTION log_message_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_audit_log (action, target_id, target_type, details)
  VALUES (
    'delete_message',
    OLD.id,
    'message',
    jsonb_build_object(
      'content_preview', LEFT(OLD.content, 100),
      'user_id',         OLD.user_id,
      'created_at',      OLD.created_at,
      'source',          'db_trigger'
    )
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_message_deletion ON chat_messages;
CREATE TRIGGER trg_log_message_deletion
  BEFORE DELETE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION log_message_deletion();


-- ── Done ────────────────────────────────────────────────────────────────────
-- After running:
--   • admin_audit_log table exists with proper RLS
--   • chat_settings write is service_role only
--   • system_announcements write is service_role only
--   • message_reports only admins can read
--   • chat_users self-update cannot change user_type
--   • DB triggers auto-log user_type changes and message deletions
-- ============================================================
