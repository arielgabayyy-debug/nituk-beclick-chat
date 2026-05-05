-- ═══════════════════════════════════════════════════════════════════════
-- SECURITY + PERFORMANCE MIGRATION — ניתוק בקליק
-- Generated: 2026-05-05
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ltwyduffgrbenghdzbji/sql/new
-- ═══════════════════════════════════════════════════════════════════════

-- ── SECTION 1: RLS — sensitive tables should be service_role only ─────────

-- otp_codes: no anon access whatsoever
ALTER TABLE IF EXISTS otp_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "otp_codes_policy" ON otp_codes;
DROP POLICY IF EXISTS "allow_all" ON otp_codes;
DROP POLICY IF EXISTS "service_role_only" ON otp_codes;
CREATE POLICY "service_role_only" ON otp_codes
  FOR ALL USING (auth.role() = 'service_role');

-- admin_notifications: service_role only
ALTER TABLE IF EXISTS admin_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_all" ON admin_notifications;
DROP POLICY IF EXISTS "allow_all" ON admin_notifications;
DROP POLICY IF EXISTS "service_role_only" ON admin_notifications;
CREATE POLICY "service_role_only" ON admin_notifications
  FOR ALL USING (auth.role() = 'service_role');

-- direct_messages: only participants can see their own DMs
ALTER TABLE IF EXISTS direct_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON direct_messages;
DROP POLICY IF EXISTS "dm_participants" ON direct_messages;
CREATE POLICY "dm_participants" ON direct_messages
  FOR ALL USING (
    sender_id = (SELECT id FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) LIMIT 1)
    OR recipient_id = (SELECT id FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) LIMIT 1)
    OR auth.role() = 'service_role'
  );

-- message_reports: only admins and service_role
ALTER TABLE IF EXISTS message_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON message_reports;
DROP POLICY IF EXISTS "reports_policy" ON message_reports;
CREATE POLICY "reports_insert" ON message_reports
  FOR INSERT WITH CHECK (true);
CREATE POLICY "reports_admin_read" ON message_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND user_type = 'admin')
    OR auth.role() = 'service_role'
  );

-- scheduled_messages: owner only
ALTER TABLE IF EXISTS scheduled_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sm: own" ON scheduled_messages;
DROP POLICY IF EXISTS "scheduled_own" ON scheduled_messages;
CREATE POLICY "scheduled_own" ON scheduled_messages
  FOR ALL USING (
    user_id = (SELECT id FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) LIMIT 1)
    OR auth.role() = 'service_role'
  );

-- points_transactions: owner read, service_role write
ALTER TABLE IF EXISTS points_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pt: own" ON points_transactions;
DROP POLICY IF EXISTS "points_policy" ON points_transactions;
CREATE POLICY "points_own_read" ON points_transactions
  FOR SELECT USING (
    user_id = (SELECT id FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) LIMIT 1)
    OR auth.role() = 'service_role'
  );
CREATE POLICY "points_service_write" ON points_transactions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ── SECTION 2: PERFORMANCE INDEXES ───────────────────────────────────────

-- Fast message loading (most critical — used on every page load)
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at_desc
  ON chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
  ON chat_messages(user_id);

-- Partial index for pinned messages (very small set, fast lookup)
CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned
  ON chat_messages(is_pinned) WHERE is_pinned = true;

-- Reactions lookup by message
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id
  ON message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id
  ON message_reactions(user_id);

-- User lookups
CREATE INDEX IF NOT EXISTS idx_chat_users_email
  ON chat_users(email);

-- Partial index for online users (very frequently queried)
CREATE INDEX IF NOT EXISTS idx_chat_users_is_online
  ON chat_users(is_online) WHERE is_online = true;

CREATE INDEX IF NOT EXISTS idx_chat_users_user_type
  ON chat_users(user_type);

-- Admin notifications (ordered by created_at)
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at
  ON admin_notifications(created_at DESC);

-- DM lookups
CREATE INDEX IF NOT EXISTS idx_direct_messages_participants
  ON direct_messages(sender_id, recipient_id, created_at DESC);

-- Keyword alerts
CREATE INDEX IF NOT EXISTS idx_user_keyword_alerts_user_id
  ON user_keyword_alerts(user_id);

-- ── SECTION 3: DB-LEVEL CONSTRAINTS (defense in depth) ───────────────────

-- Message content: max 2000 chars, not empty (idempotent — skips if exists)
ALTER TABLE chat_messages
  ADD CONSTRAINT IF NOT EXISTS message_content_length
    CHECK (char_length(content) <= 2000);

ALTER TABLE chat_messages
  ADD CONSTRAINT IF NOT EXISTS message_content_not_empty
    CHECK (char_length(trim(content)) > 0);

-- User name: 1–100 chars
ALTER TABLE chat_users
  ADD CONSTRAINT IF NOT EXISTS user_name_length
    CHECK (char_length(name) BETWEEN 1 AND 100);

-- Email format (basic sanity check)
ALTER TABLE chat_users
  ADD CONSTRAINT IF NOT EXISTS user_email_format
    CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- ── SECTION 4: SERVER-SIDE RATE LIMIT TABLE ───────────────────────────────

CREATE TABLE IF NOT EXISTS message_rate_limits (
  user_id      UUID PRIMARY KEY,
  message_count INT DEFAULT 0,
  window_start  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE message_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rate_limits_service" ON message_rate_limits;
CREATE POLICY "rate_limits_service" ON message_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Function: check + increment rate limit (max 20 messages/minute per user)
CREATE OR REPLACE FUNCTION check_message_rate_limit(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
  v_window TIMESTAMPTZ;
BEGIN
  SELECT message_count, window_start
  INTO v_count, v_window
  FROM message_rate_limits WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO message_rate_limits (user_id, message_count, window_start)
    VALUES (p_user_id, 1, NOW());
    RETURN true;
  END IF;

  IF NOW() - v_window > INTERVAL '1 minute' THEN
    UPDATE message_rate_limits
    SET message_count = 1, window_start = NOW()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  IF v_count >= 20 THEN
    RETURN false;
  END IF;

  UPDATE message_rate_limits
  SET message_count = message_count + 1
  WHERE user_id = p_user_id;
  RETURN true;
END;
$$;

-- ── SECTION 5: BLOCKED USER RLS ENFORCEMENT ──────────────────────────────

-- Ensure blocked users cannot post messages via RLS
-- (This requires auth.uid() to map to a chat_users row)
DROP POLICY IF EXISTS "msg_insert_blocked_check" ON chat_messages;
CREATE POLICY "msg_insert_blocked_check" ON chat_messages
  FOR INSERT WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM chat_users cu
      JOIN auth.users au ON au.email = cu.email
      WHERE au.id = auth.uid()
      AND cu.user_type = 'blocked'
    )
  );

-- ── SECTION 6: ADMIN AUDIT LOG ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id    UUID REFERENCES chat_users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_id   UUID,
  target_type TEXT,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_read" ON admin_audit_log;
DROP POLICY IF EXISTS "audit_insert" ON admin_audit_log;

CREATE POLICY "audit_admin_read" ON admin_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND user_type = 'admin')
    OR auth.role() = 'service_role'
  );

CREATE POLICY "audit_service_insert" ON admin_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ══════════════════════════════════════════════════════════════════════════
-- Done! Run each section independently if any fail due to existing objects.
-- ══════════════════════════════════════════════════════════════════════════
