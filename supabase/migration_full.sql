-- ============================================================
-- FULL SCHEMA MIGRATION — חיבור וניתוק בקליק
-- Run this entire script in the Supabase SQL Editor.
-- All statements use IF NOT EXISTS / IF EXISTS so it is safe
-- to run multiple times.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. chat_users — add missing columns & fix CHECK constraint
-- ────────────────────────────────────────────────────────────

ALTER TABLE chat_users
  ADD COLUMN IF NOT EXISTS avatar_url       TEXT,
  ADD COLUMN IF NOT EXISTS helpful_count    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_points    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_user_of_week  BOOLEAN NOT NULL DEFAULT false;

-- Extend user_type to allow 'blocked'
-- Drop old constraint and recreate with all 5 values
ALTER TABLE chat_users
  DROP CONSTRAINT IF EXISTS chat_users_user_type_check;

ALTER TABLE chat_users
  ADD CONSTRAINT chat_users_user_type_check
  CHECK (user_type IN ('guest', 'subscriber', 'newsletter', 'admin', 'blocked'));


-- ────────────────────────────────────────────────────────────
-- 2. chat_messages — add missing columns
-- ────────────────────────────────────────────────────────────

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_pinned     BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS upvotes_count INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_gif       BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gif_url       TEXT,
  ADD COLUMN IF NOT EXISTS mentions      TEXT[];


-- ────────────────────────────────────────────────────────────
-- 3. otp_codes — add rate-limiting columns
-- ────────────────────────────────────────────────────────────

ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS attempts     INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;

-- Unique constraint on email for upsert
ALTER TABLE otp_codes
  DROP CONSTRAINT IF EXISTS otp_codes_email_key;

ALTER TABLE otp_codes
  ADD CONSTRAINT otp_codes_email_key UNIQUE (email);


-- ────────────────────────────────────────────────────────────
-- 4. system_messages
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES chat_users(id) ON DELETE SET NULL,
  message_type TEXT        NOT NULL CHECK (message_type IN ('join', 'leave', 'announcement')),
  content      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 5. typing_users
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS typing_users (
  user_id    UUID        PRIMARY KEY REFERENCES chat_users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 6. message_reactions
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS message_reactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES chat_users(id)    ON DELETE CASCADE,
  emoji      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);


-- ────────────────────────────────────────────────────────────
-- 7. message_upvotes
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS message_upvotes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES chat_users(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);


-- ────────────────────────────────────────────────────────────
-- 8. polls + poll_options + poll_votes
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS polls (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question   TEXT        NOT NULL,
  created_by UUID        REFERENCES chat_users(id) ON DELETE SET NULL,
  ends_at    TIMESTAMPTZ,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_options (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     UUID    NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT    NOT NULL,
  votes_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id   UUID        NOT NULL REFERENCES polls(id)        ON DELETE CASCADE,
  option_id UUID        NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES chat_users(id)   ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, user_id)   -- one vote per user per poll
);


-- ────────────────────────────────────────────────────────────
-- 9. hot_deals + deal_votes
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hot_deals (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  description    TEXT,
  provider       TEXT,
  savings_amount NUMERIC(10,2),
  upvotes        INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deal_votes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id    UUID        NOT NULL REFERENCES hot_deals(id)  ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  vote_type  TEXT        NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (deal_id, user_id)
);


-- ────────────────────────────────────────────────────────────
-- 10. daily_questions
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_questions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question        TEXT        NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT false,
  responses_count INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 11. daily_tips
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_tips (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_text   TEXT        NOT NULL,
  category   TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 12. success_stories
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS success_stories (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  story          TEXT        NOT NULL,
  savings_amount NUMERIC(10,2),
  likes_count    INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 13. community_events
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT,
  event_type  TEXT        NOT NULL CHECK (event_type IN ('expert_hour', 'quiz', 'special')),
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 14. user_achievements
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_achievements (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  achievement_type TEXT        NOT NULL,
  earned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_type)
);


-- ────────────────────────────────────────────────────────────
-- 15. RPC functions
-- ────────────────────────────────────────────────────────────

-- Atomically increment upvotes on a message
CREATE OR REPLACE FUNCTION increment_upvotes(message_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE chat_messages
  SET upvotes_count = upvotes_count + 1
  WHERE id = message_id;
$$;

-- Atomically increment votes_count on a poll option
CREATE OR REPLACE FUNCTION increment_poll_vote(option_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE poll_options
  SET votes_count = votes_count + 1
  WHERE id = option_id;
$$;


-- ────────────────────────────────────────────────────────────
-- 16. Enable Realtime on all tables that need live updates
-- ────────────────────────────────────────────────────────────

-- chat_messages, chat_users, system_messages, typing_users,
-- message_reactions are subscribed to in use-chat.ts
-- polls, poll_votes, hot_deals, community_events are subscribed
-- to in use-community.ts

ALTER PUBLICATION supabase_realtime
  ADD TABLE chat_messages,
            chat_users,
            system_messages,
            typing_users,
            message_reactions,
            polls,
            poll_votes,
            hot_deals,
            community_events;


-- ────────────────────────────────────────────────────────────
-- 17. Row Level Security — open policies (anon key access)
-- These match the current setup where the app uses the
-- anon key directly from the browser. Tighten later if needed.
-- ────────────────────────────────────────────────────────────

-- chat_users
ALTER TABLE chat_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_chat_users" ON chat_users;
CREATE POLICY "allow_all_chat_users" ON chat_users FOR ALL USING (true) WITH CHECK (true);

-- chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_chat_messages" ON chat_messages;
CREATE POLICY "allow_all_chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- system_messages
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_system_messages" ON system_messages;
CREATE POLICY "allow_all_system_messages" ON system_messages FOR ALL USING (true) WITH CHECK (true);

-- typing_users
ALTER TABLE typing_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_typing_users" ON typing_users;
CREATE POLICY "allow_all_typing_users" ON typing_users FOR ALL USING (true) WITH CHECK (true);

-- message_reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_message_reactions" ON message_reactions;
CREATE POLICY "allow_all_message_reactions" ON message_reactions FOR ALL USING (true) WITH CHECK (true);

-- message_upvotes
ALTER TABLE message_upvotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_message_upvotes" ON message_upvotes;
CREATE POLICY "allow_all_message_upvotes" ON message_upvotes FOR ALL USING (true) WITH CHECK (true);

-- otp_codes
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_otp_codes" ON otp_codes;
CREATE POLICY "allow_all_otp_codes" ON otp_codes FOR ALL USING (true) WITH CHECK (true);

-- muted_users
ALTER TABLE muted_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_muted_users" ON muted_users;
CREATE POLICY "allow_all_muted_users" ON muted_users FOR ALL USING (true) WITH CHECK (true);

-- banned_users
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_banned_users" ON banned_users;
CREATE POLICY "allow_all_banned_users" ON banned_users FOR ALL USING (true) WITH CHECK (true);

-- polls
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_polls" ON polls;
CREATE POLICY "allow_all_polls" ON polls FOR ALL USING (true) WITH CHECK (true);

-- poll_options
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_poll_options" ON poll_options;
CREATE POLICY "allow_all_poll_options" ON poll_options FOR ALL USING (true) WITH CHECK (true);

-- poll_votes
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_poll_votes" ON poll_votes;
CREATE POLICY "allow_all_poll_votes" ON poll_votes FOR ALL USING (true) WITH CHECK (true);

-- hot_deals
ALTER TABLE hot_deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_hot_deals" ON hot_deals;
CREATE POLICY "allow_all_hot_deals" ON hot_deals FOR ALL USING (true) WITH CHECK (true);

-- deal_votes
ALTER TABLE deal_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_deal_votes" ON deal_votes;
CREATE POLICY "allow_all_deal_votes" ON deal_votes FOR ALL USING (true) WITH CHECK (true);

-- daily_questions
ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_daily_questions" ON daily_questions;
CREATE POLICY "allow_all_daily_questions" ON daily_questions FOR ALL USING (true) WITH CHECK (true);

-- daily_tips
ALTER TABLE daily_tips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_daily_tips" ON daily_tips;
CREATE POLICY "allow_all_daily_tips" ON daily_tips FOR ALL USING (true) WITH CHECK (true);

-- success_stories
ALTER TABLE success_stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_success_stories" ON success_stories;
CREATE POLICY "allow_all_success_stories" ON success_stories FOR ALL USING (true) WITH CHECK (true);

-- community_events
ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_community_events" ON community_events;
CREATE POLICY "allow_all_community_events" ON community_events FOR ALL USING (true) WITH CHECK (true);

-- user_achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_user_achievements" ON user_achievements;
CREATE POLICY "allow_all_user_achievements" ON user_achievements FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 18. Useful indexes for performance
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at  ON chat_messages  (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id     ON chat_messages  (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_pinned   ON chat_messages  (is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_message_reactions_msg     ON message_reactions (message_id);
CREATE INDEX IF NOT EXISTS idx_system_messages_created   ON system_messages   (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hot_deals_upvotes         ON hot_deals         (upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_chat_users_weekly_pts     ON chat_users        (weekly_points DESC);
CREATE INDEX IF NOT EXISTS idx_chat_users_is_online      ON chat_users        (is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_user_achievements_user    ON user_achievements  (user_id);
