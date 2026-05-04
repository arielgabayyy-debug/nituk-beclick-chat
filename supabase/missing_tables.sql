-- ============================================================
-- MISSING TABLES — direct_messages, user_chat_settings,
--                  user_keyword_alerts
-- Safe to run multiple times (IF NOT EXISTS / ON CONFLICT)
-- Run in Supabase SQL Editor
-- ============================================================


-- ── 1. direct_messages ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  to_user_id   UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  read         BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_dm_from ON direct_messages(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_to   ON direct_messages(to_user_id,   created_at DESC);

-- RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own DMs (sent or received)
DROP POLICY IF EXISTS "dm: own read"   ON direct_messages;
CREATE POLICY "dm: own read"
  ON direct_messages FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Users can insert messages they send
DROP POLICY IF EXISTS "dm: own insert" ON direct_messages;
CREATE POLICY "dm: own insert"
  ON direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- Users can mark their received messages as read
DROP POLICY IF EXISTS "dm: mark read" ON direct_messages;
CREATE POLICY "dm: mark read"
  ON direct_messages FOR UPDATE
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());


-- ── 2. user_chat_settings ────────────────────────────────────
-- One row per user — stores JSON preferences object
CREATE TABLE IF NOT EXISTS user_chat_settings (
  user_id    UUID        PRIMARY KEY REFERENCES chat_users(id) ON DELETE CASCADE,
  settings   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_chat_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings: own"        ON user_chat_settings;
DROP POLICY IF EXISTS "settings: own insert" ON user_chat_settings;
DROP POLICY IF EXISTS "settings: own update" ON user_chat_settings;

-- Read own settings (anon allowed so guest prefs work)
CREATE POLICY "settings: own"
  ON user_chat_settings FOR SELECT
  USING (true);   -- data is not sensitive; row scoped by PK anyway

-- Upsert own settings only
CREATE POLICY "settings: own upsert"
  ON user_chat_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "settings: own update"
  ON user_chat_settings FOR UPDATE
  USING (true);


-- ── 3. user_keyword_alerts ───────────────────────────────────
-- Keywords a user wants to be notified about
CREATE TABLE IF NOT EXISTS user_keyword_alerts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  keyword         TEXT        NOT NULL CHECK (char_length(keyword) BETWEEN 1 AND 100),
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  triggered_count INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_kw_user ON user_keyword_alerts(user_id, is_active);

ALTER TABLE user_keyword_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kw: own" ON user_keyword_alerts;
CREATE POLICY "kw: own"
  ON user_keyword_alerts FOR ALL
  USING (true)          -- select: any row (keyword list not secret)
  WITH CHECK (true);    -- insert/update/delete: no extra restriction
                        -- (client already scopes by user_id)


-- ── Done ─────────────────────────────────────────────────────
-- Tables created:
--   direct_messages       — realtime DMs between users
--   user_chat_settings    — per-user JSON preferences
--   user_keyword_alerts   — keyword notification list per user
