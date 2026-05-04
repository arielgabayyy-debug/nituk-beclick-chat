-- ============================================================
-- ADMIN SCHEMA — tables for admin dashboard features
-- Run in Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- ── chat_settings — shared settings across all admins ────────
CREATE TABLE IF NOT EXISTS chat_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO chat_settings (key, value) VALUES
  ('slow_mode',         '{"enabled": false, "seconds": 10}'::jsonb),
  ('banned_words',      '{"words": []}'::jsonb),
  ('maintenance_mode',  '{"enabled": false, "message": "חזרה בקרוב..."}'::jsonb),
  ('welcome_message',   '{"text": "ברוכים הבאים לניתוק בקליק!", "enabled": true}'::jsonb),
  ('registration',      '{"allow_guests": true, "require_email": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS: only admins can read/write settings
ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin read settings"  ON chat_settings;
DROP POLICY IF EXISTS "admin write settings" ON chat_settings;
DROP POLICY IF EXISTS "public read settings" ON chat_settings;

-- Allow public read (app reads slow_mode etc.)
CREATE POLICY "public read settings"
  ON chat_settings FOR SELECT USING (true);

-- Allow service role writes (API does it)
-- (service role bypasses RLS)


-- ── message_reports — reported messages stored in Supabase ───
CREATE TABLE IF NOT EXISTS message_reports (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID        REFERENCES chat_messages(id) ON DELETE CASCADE,
  reporter_id UUID        REFERENCES chat_users(id)   ON DELETE SET NULL,
  reason      TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'resolved', 'dismissed')),
  admin_note  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can insert reports" ON message_reports;
DROP POLICY IF EXISTS "admin can read reports"   ON message_reports;

CREATE POLICY "users can insert reports"
  ON message_reports FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "admin can read reports"
  ON message_reports FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_message_reports_status     ON message_reports(status);
CREATE INDEX IF NOT EXISTS idx_message_reports_message_id ON message_reports(message_id);


-- ── system_announcements — admin can push messages to chat ───
CREATE TABLE IF NOT EXISTS system_announcements (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content    TEXT        NOT NULL,
  admin_id   UUID        REFERENCES chat_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public can read announcements" ON system_announcements;
CREATE POLICY "public can read announcements"
  ON system_announcements FOR SELECT USING (true);


-- ── polls (if not already exists) ───────────────────────────
CREATE TABLE IF NOT EXISTS polls (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question   TEXT        NOT NULL,
  options    JSONB       NOT NULL DEFAULT '[]',
  votes      JSONB       NOT NULL DEFAULT '{}',
  creator_id UUID        REFERENCES chat_users(id) ON DELETE SET NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at    TIMESTAMPTZ
);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public can read polls"   ON polls;
DROP POLICY IF EXISTS "public can vote polls"   ON polls;
CREATE POLICY "public can read polls"  ON polls FOR SELECT  USING (true);
CREATE POLICY "public can vote polls"  ON polls FOR UPDATE  USING (true);


-- ── Done ─────────────────────────────────────────────────────
-- After running this:
--  • Settings stored in Supabase (shared between all admin sessions)
--  • Reports stored in Supabase (persistent, queryable)
--  • Polls table ready
--  • System announcements table ready
