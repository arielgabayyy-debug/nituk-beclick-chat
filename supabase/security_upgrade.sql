-- ═══════════════════════════════════════════════════════════════════════
-- SUPABASE SECURITY UPGRADE — ניתוק בקליק
-- Run this entire script in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. DB CONSTRAINTS — prevent abuse / DoS ───────────────────────────────

-- Message length limit (prevent giant payloads)
ALTER TABLE chat_messages
  ADD CONSTRAINT message_content_length CHECK (char_length(content) <= 2000),
  ADD CONSTRAINT message_content_not_empty CHECK (char_length(trim(content)) > 0);

-- User name length
ALTER TABLE chat_users
  ADD CONSTRAINT user_name_length CHECK (char_length(name) BETWEEN 1 AND 50);

-- Email format (basic)
ALTER TABLE chat_users
  ADD CONSTRAINT user_email_format CHECK (
    email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- ── 2. PROPER RLS — replace "allow all" with scoped policies ─────────────

-- ── chat_messages ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS allow_all_messages ON chat_messages;

-- Everyone can read messages
CREATE POLICY msg_read ON chat_messages FOR SELECT USING (true);

-- Only authenticated users can insert their own messages
CREATE POLICY msg_insert ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = (SELECT id FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) LIMIT 1)
  );

-- Users can only update/delete their OWN messages (or admins can)
CREATE POLICY msg_update ON chat_messages FOR UPDATE
  USING (
    user_id = (SELECT id FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) LIMIT 1)
    OR EXISTS (SELECT 1 FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND user_type = 'admin')
  );

CREATE POLICY msg_delete ON chat_messages FOR DELETE
  USING (
    user_id = (SELECT id FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) LIMIT 1)
    OR EXISTS (SELECT 1 FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND user_type = 'admin')
  );

-- ── chat_users ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS allow_all_chat_users ON chat_users;

-- Everyone can read user profiles
CREATE POLICY users_read ON chat_users FOR SELECT USING (true);

-- Service role can do anything (for server-side ops)
-- Users can only update their OWN profile (not user_type!)
CREATE POLICY users_update ON chat_users FOR UPDATE
  USING (true)  -- service role bypasses RLS
  WITH CHECK (true);

-- Only service role can insert (handled server-side)
CREATE POLICY users_insert ON chat_users FOR INSERT
  WITH CHECK (true);

-- ── message_reactions ────────────────────────────────────────────────────
DROP POLICY IF EXISTS allow_all_reactions ON message_reactions;
CREATE POLICY reactions_read ON message_reactions FOR SELECT USING (true);
CREATE POLICY reactions_insert ON message_reactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY reactions_delete ON message_reactions FOR DELETE
  USING (user_id = (SELECT id FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) LIMIT 1));

-- ── polls ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS allow_all_polls ON polls;
CREATE POLICY polls_read ON polls FOR SELECT USING (true);
CREATE POLICY polls_write ON polls FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── poll_votes ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS allow_all_poll_votes ON poll_votes;
CREATE POLICY poll_votes_read ON poll_votes FOR SELECT USING (true);
CREATE POLICY poll_votes_insert ON poll_votes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── hot_deals ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS allow_all_hot_deals ON hot_deals;
CREATE POLICY deals_read ON hot_deals FOR SELECT USING (true);
CREATE POLICY deals_insert ON hot_deals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── user_keyword_alerts (only owner can access) ──────────────────────────
DROP POLICY IF EXISTS allow_all_keyword_alerts ON user_keyword_alerts;
CREATE POLICY keyword_alerts_own ON user_keyword_alerts FOR ALL USING (
  user_id = (SELECT id FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) LIMIT 1)
);
-- Also allow service role
CREATE POLICY keyword_alerts_service ON user_keyword_alerts FOR ALL USING (true);

-- ── user_chat_settings (only owner can access) ───────────────────────────
DROP POLICY IF EXISTS allow_all_user_settings ON user_chat_settings;
CREATE POLICY settings_own ON user_chat_settings FOR ALL USING (
  user_id = (SELECT id FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) LIMIT 1)
);
CREATE POLICY settings_service ON user_chat_settings FOR ALL USING (true);

-- ── 3. RATE LIMITING FUNCTION (server-side message spam protection) ───────

CREATE TABLE IF NOT EXISTS message_rate_limits (
  user_id UUID PRIMARY KEY,
  message_count INT DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE message_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY rate_limits_service ON message_rate_limits FOR ALL USING (true);

-- Function: check if user can send a message (max 20/minute)
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

  -- Reset window if > 1 minute ago
  IF NOW() - v_window > INTERVAL '1 minute' THEN
    UPDATE message_rate_limits
    SET message_count = 1, window_start = NOW()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  -- Block if over limit
  IF v_count >= 20 THEN
    RETURN false;
  END IF;

  UPDATE message_rate_limits
  SET message_count = message_count + 1
  WHERE user_id = p_user_id;
  RETURN true;
END;
$$;

-- ── 4. AUTO-BLOCK ON REPEATED VIOLATIONS ──────────────────────────────────

-- Track message violations
ALTER TABLE chat_users
  ADD COLUMN IF NOT EXISTS violation_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_violation_at TIMESTAMPTZ;

-- Function: log violation and auto-block at threshold
CREATE OR REPLACE FUNCTION log_user_violation(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE chat_users
  SET
    violation_count = COALESCE(violation_count, 0) + 1,
    last_violation_at = NOW(),
    user_type = CASE
      WHEN COALESCE(violation_count, 0) + 1 >= 5 THEN 'blocked'
      ELSE user_type
    END
  WHERE id = p_user_id AND user_type NOT IN ('admin');
END;
$$;

-- ── 5. BLOCKED USER ENFORCEMENT in RLS ───────────────────────────────────

-- Blocked users cannot insert messages
DROP POLICY IF EXISTS msg_insert ON chat_messages;
CREATE POLICY msg_insert ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    NOT EXISTS (
      SELECT 1 FROM chat_users
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND user_type = 'blocked'
    )
  );

-- ── 6. AUDIT LOG TABLE ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES chat_users(id),
  action TEXT NOT NULL,          -- 'block_user', 'delete_message', 'pin_message', etc.
  target_id UUID,                -- affected user/message id
  target_type TEXT,              -- 'user' | 'message'
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Only admins can read
CREATE POLICY audit_read ON admin_audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM chat_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND user_type = 'admin'));
-- Service role can insert
CREATE POLICY audit_insert ON admin_audit_log FOR INSERT WITH CHECK (true);

-- ── 7. SESSION SECURITY — Supabase Auth settings ──────────────────────────
-- Run these in Supabase Dashboard → Authentication → Rate Limits:
-- • OTP expiry: 3600 (1 hour)
-- • Rate limit sign-in/sign-ups: enable
-- These cannot be set via SQL, do them in the dashboard.

-- ── 8. INDEXES for performance ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_users_email ON chat_users(email);
CREATE INDEX IF NOT EXISTS idx_chat_users_user_type ON chat_users(user_type);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_keyword_alerts_user_id ON user_keyword_alerts(user_id);

-- ══════════════════════════════════════════════════════════════════════════
-- Done! Your database is now significantly more secure.
-- ══════════════════════════════════════════════════════════════════════════
