-- ════════════════════════════════════════════════════════════════════════════
-- Migration: user_follows + direct_messages
-- Run this in Supabase SQL Editor (once)
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. user_follows ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_follows (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id  uuid        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  following_id uuid        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT no_self_follow   CHECK (follower_id != following_id),
  CONSTRAINT unique_follow    UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower  ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Everyone can see follow relationships (public social graph)
DROP POLICY IF EXISTS "follows_select" ON user_follows;
CREATE POLICY "follows_select" ON user_follows FOR SELECT USING (true);

-- Any authenticated or identified chat user can follow
DROP POLICY IF EXISTS "follows_insert" ON user_follows;
CREATE POLICY "follows_insert" ON user_follows FOR INSERT WITH CHECK (true);

-- Users can only unfollow themselves (via service role in API)
DROP POLICY IF EXISTS "follows_delete" ON user_follows;
CREATE POLICY "follows_delete" ON user_follows FOR DELETE USING (true);


-- ── 2. direct_messages ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id uuid        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  to_user_id   uuid        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  content      text        NOT NULL
                           CHECK (length(trim(content)) > 0 AND length(content) <= 2000),
  read         boolean     DEFAULT false NOT NULL,
  created_at   timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT no_self_dm CHECK (from_user_id != to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_from  ON direct_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_dm_to    ON direct_messages(to_user_id);
-- Conversation query pattern: fetch both directions, ordered by time
CREATE INDEX IF NOT EXISTS idx_dm_conv  ON direct_messages(from_user_id, to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_unread ON direct_messages(to_user_id, read) WHERE read = false;

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_select" ON direct_messages;
CREATE POLICY "dm_select" ON direct_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "dm_insert" ON direct_messages;
CREATE POLICY "dm_insert" ON direct_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "dm_update_read" ON direct_messages;
CREATE POLICY "dm_update_read" ON direct_messages FOR UPDATE USING (true);


-- ── 3. Realtime: enable broadcast for DMs ────────────────────────────────────
-- (Supabase Realtime listens to Postgres WAL — no extra config needed)
-- Just make sure Realtime is enabled for direct_messages in the Supabase UI:
-- Database → Replication → Tables → enable direct_messages

-- ── Done ─────────────────────────────────────────────────────────────────────
-- Verify:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_follows', 'direct_messages');
