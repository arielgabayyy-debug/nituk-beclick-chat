-- ══════════════════════════════════════════════════════════════════════════════
-- NITUK BECLICK — FULL SETUP SCRIPT FOR NEW SUPABASE PROJECT (eu-central-1)
-- Run this ONCE in the new project's SQL Editor.
-- Safe to run in one shot — uses IF NOT EXISTS / OR REPLACE throughout.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CORE TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- chat_users — one row per user (guest, subscriber, newsletter, admin, blocked)
CREATE TABLE IF NOT EXISTS chat_users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  email            TEXT        CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  user_type        TEXT        NOT NULL DEFAULT 'guest'
                               CHECK (user_type IN ('guest','subscriber','newsletter','admin','blocked')),
  avatar_color     TEXT        NOT NULL DEFAULT '#06b6d4',
  avatar_url       TEXT,
  is_online        BOOLEAN     NOT NULL DEFAULT false,
  last_seen        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  points           INTEGER     NOT NULL DEFAULT 0,
  weekly_points    INTEGER     NOT NULL DEFAULT 0,
  helpful_count    INTEGER     NOT NULL DEFAULT 0,
  is_user_of_week  BOOLEAN     NOT NULL DEFAULT false,
  level            INTEGER     NOT NULL DEFAULT 1,
  messages_count   INTEGER     NOT NULL DEFAULT 0,
  violation_count  INTEGER     NOT NULL DEFAULT 0,
  last_violation_at TIMESTAMPTZ,
  email_consent    BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- chat_messages — public chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  content       TEXT        NOT NULL
                            CHECK (char_length(content) <= 2000 AND char_length(trim(content)) > 0),
  is_pinned     BOOLEAN     NOT NULL DEFAULT false,
  upvotes_count INTEGER     NOT NULL DEFAULT 0,
  has_gif       BOOLEAN     NOT NULL DEFAULT false,
  gif_url       TEXT,
  mentions      TEXT[],
  updated_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- otp_codes — email OTP for guest/newsletter login
CREATE TABLE IF NOT EXISTS otp_codes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        NOT NULL,
  code         TEXT        NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  attempts     INTEGER     NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email)
);

-- system_messages — join/leave/announcement system events
CREATE TABLE IF NOT EXISTS system_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES chat_users(id) ON DELETE SET NULL,
  message_type TEXT        NOT NULL CHECK (message_type IN ('join','leave','announcement')),
  content      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- typing_users — who is currently typing (realtime)
CREATE TABLE IF NOT EXISTS typing_users (
  user_id    UUID        PRIMARY KEY REFERENCES chat_users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- message_reactions — emoji reactions on messages
CREATE TABLE IF NOT EXISTS message_reactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES chat_users(id)    ON DELETE CASCADE,
  emoji      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

-- message_upvotes — upvotes on messages (helpful)
CREATE TABLE IF NOT EXISTS message_upvotes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES chat_users(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

-- muted_users — users muted by admin
CREATE TABLE IF NOT EXISTS muted_users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  muted_by   UUID        REFERENCES chat_users(id) ON DELETE SET NULL,
  reason     TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- banned_users — permanently banned
CREATE TABLE IF NOT EXISTS banned_users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  banned_by  UUID        REFERENCES chat_users(id) ON DELETE SET NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COMMUNITY TABLES
-- ─────────────────────────────────────────────────────────────────────────────

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
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    UUID        NOT NULL REFERENCES polls(id)        ON DELETE CASCADE,
  option_id  UUID        NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES chat_users(id)   ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

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
  vote_type  TEXT        NOT NULL CHECK (vote_type IN ('up','down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (deal_id, user_id)
);

CREATE TABLE IF NOT EXISTS daily_questions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question        TEXT        NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT false,
  responses_count INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_tips (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_text   TEXT        NOT NULL,
  category   TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS success_stories (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  story          TEXT        NOT NULL,
  savings_amount NUMERIC(10,2),
  likes_count    INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT,
  event_type  TEXT        NOT NULL CHECK (event_type IN ('expert_hour','quiz','special')),
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  achievement_type TEXT        NOT NULL,
  earned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_type)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ADMIN TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO chat_settings (key, value) VALUES
  ('slow_mode',        '{"enabled": false, "seconds": 10}'),
  ('banned_words',     '{"words": []}'),
  ('maintenance_mode', '{"enabled": false, "message": "חזרה בקרוב..."}'),
  ('welcome_message',  '{"text": "ברוכים הבאים לניתוק בקליק!", "enabled": true}'),
  ('registration',     '{"allow_guests": true, "require_email": false}')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS message_reports (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID        REFERENCES chat_messages(id) ON DELETE CASCADE,
  reporter_id UUID        REFERENCES chat_users(id)    ON DELETE SET NULL,
  reason      TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','resolved','dismissed')),
  admin_note  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system_announcements (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content    TEXT        NOT NULL,
  admin_id   UUID        REFERENCES chat_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL DEFAULT 'new_registration',
  user_name  TEXT,
  user_email TEXT,
  user_type  TEXT,
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID        REFERENCES chat_users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  target_id   UUID,
  target_type TEXT,
  details     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  name       TEXT,
  subscribed BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id   UUID,
  email          TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending',
  sent_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject      TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  admin_id     UUID        REFERENCES chat_users(id) ON DELETE SET NULL,
  sent_count   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_credentials (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  totp_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. USER PREFERENCE / SOCIAL TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_chat_settings (
  user_id    UUID        PRIMARY KEY REFERENCES chat_users(id) ON DELETE CASCADE,
  settings   JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_keyword_alerts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  keyword         TEXT        NOT NULL CHECK (char_length(keyword) BETWEEN 1 AND 100),
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  triggered_count INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, keyword)
);

CREATE TABLE IF NOT EXISTS user_follows (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  following_id UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_follow UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  to_user_id   UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 2000),
  read         BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_dm CHECK (from_user_id != to_user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. EXTRA FEATURE TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bookmarked_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES chat_users(id)    ON DELETE CASCADE,
  message_id UUID        NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, message_id)
);

CREATE TABLE IF NOT EXISTS pinned_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  pinned_by  UUID        REFERENCES chat_users(id) ON DELETE SET NULL,
  pinned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent         BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS points_transactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  amount     INTEGER     NOT NULL,
  reason     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         TEXT        NOT NULL,
  endpoint   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_rate_limits (
  user_id       UUID        PRIMARY KEY,
  message_count INT         NOT NULL DEFAULT 0,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- chat_messages — primary read path (ordered by time, paginated)
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at_desc ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id         ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned          ON chat_messages(is_pinned) WHERE is_pinned = true;

-- message_reactions — per-message lookups
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id  ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id     ON message_reactions(user_id);

-- chat_users — auth, online count, leaderboard
CREATE INDEX IF NOT EXISTS idx_chat_users_email              ON chat_users(email);
CREATE INDEX IF NOT EXISTS idx_chat_users_is_online          ON chat_users(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_chat_users_user_type          ON chat_users(user_type);
CREATE INDEX IF NOT EXISTS idx_chat_users_weekly_points      ON chat_users(weekly_points DESC);

-- admin
CREATE INDEX IF NOT EXISTS idx_message_reports_status        ON message_reports(status);
CREATE INDEX IF NOT EXISTS idx_message_reports_message_id    ON message_reports(message_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread    ON admin_notifications(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created   ON admin_notifications(created_at DESC);

-- social
CREATE INDEX IF NOT EXISTS idx_user_follows_follower         ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following        ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_dm_from                       ON direct_messages(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_to                         ON direct_messages(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_unread                     ON direct_messages(to_user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_dm_conv                       ON direct_messages(from_user_id, to_user_id, created_at DESC);

-- misc
CREATE INDEX IF NOT EXISTS idx_user_keyword_alerts_user      ON user_keyword_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint       ON rate_limits(ip, endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_messages_created       ON system_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hot_deals_upvotes             ON hot_deals(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user        ON user_achievements(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE chat_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_upvotes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE muted_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls                ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options         ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_deals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_votes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tips           ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_stories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_broadcasts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_credentials    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_chat_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_keyword_alerts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows         ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarked_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_rate_limits  ENABLE ROW LEVEL SECURITY;

-- Public read / service write pattern (chat tables)
CREATE POLICY "public_all" ON chat_users          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON chat_messages        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON system_messages      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON typing_users         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON message_reactions    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON message_upvotes      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON muted_users          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON banned_users         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON polls                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON poll_options         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON poll_votes           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON hot_deals            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON deal_votes           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON daily_questions      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON daily_tips           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON success_stories      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON community_events     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON user_achievements    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_read" ON chat_settings       FOR SELECT USING (true);
CREATE POLICY "public_all" ON message_reports      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON system_announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON admin_notifications  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON admin_audit_log      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON otp_codes            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON newsletter_subscribers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON broadcast_recipients   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON admin_broadcasts       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON admin_credentials      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON user_chat_settings     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON user_keyword_alerts    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON user_follows           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON direct_messages        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON bookmarked_messages    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON pinned_messages        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON scheduled_messages     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON points_transactions    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON rate_limits            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON message_rate_limits    FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. REALTIME — enable postgres_changes on all live tables
-- ─────────────────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE
  chat_messages,
  chat_users,
  system_messages,
  typing_users,
  message_reactions,
  polls,
  poll_votes,
  hot_deals,
  community_events,
  direct_messages;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('chat-audio', 'chat-audio', true, 20971520,
   ARRAY['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/aac',
         'audio/wav','audio/x-m4a','audio/m4a',
         'video/webm','video/mp4','video/quicktime','video/avi',
         'video/x-msvideo','application/octet-stream']),
  ('chat-images', 'chat-images', true, 10485760,
   ARRAY['image/jpeg','image/png','image/gif','image/webp',
         'image/svg+xml','image/heic','image/heif'])
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat-audio: public read"  ON storage.objects FOR SELECT USING (bucket_id = 'chat-audio');
CREATE POLICY "chat-images: public read" ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');
CREATE POLICY "chat-audio: auth upload"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-audio');
CREATE POLICY "chat-images: auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-images');
CREATE POLICY "storage: service all"     ON storage.objects FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_upvotes(message_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE chat_messages SET upvotes_count = upvotes_count + 1 WHERE id = message_id;
$$;

CREATE OR REPLACE FUNCTION increment_poll_vote(option_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = option_id;
$$;

CREATE OR REPLACE FUNCTION check_message_rate_limit(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT; v_window TIMESTAMPTZ;
BEGIN
  SELECT message_count, window_start INTO v_count, v_window
  FROM message_rate_limits WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO message_rate_limits VALUES (p_user_id, 1, NOW()); RETURN true;
  END IF;
  IF NOW() - v_window > INTERVAL '1 minute' THEN
    UPDATE message_rate_limits SET message_count=1, window_start=NOW() WHERE user_id=p_user_id;
    RETURN true;
  END IF;
  IF v_count >= 20 THEN RETURN false; END IF;
  UPDATE message_rate_limits SET message_count=message_count+1 WHERE user_id=p_user_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION log_user_violation(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE chat_users SET
    violation_count = COALESCE(violation_count,0)+1,
    last_violation_at = NOW(),
    user_type = CASE WHEN COALESCE(violation_count,0)+1 >= 5 THEN 'blocked' ELSE user_type END
  WHERE id=p_user_id AND user_type NOT IN ('admin');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. TRIGGER — notify admin on new registration
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_admin_new_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.user_type = 'guest' THEN RETURN NEW; END IF;
  INSERT INTO admin_notifications (type, user_name, user_email, user_type)
  VALUES ('new_registration', NEW.name, NEW.email, NEW.user_type);
  PERFORM extensions.http_post(
    url     := 'https://nituk-beclick-chat.vercel.app/api/admin/notify-registration',
    headers := '{"Content-Type":"application/json","x-trigger-source":"supabase"}'::jsonb,
    body    := json_build_object('name',NEW.name,'email',COALESCE(NEW.email,''),'userType',NEW.user_type)::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_user_registration ON chat_users;
CREATE TRIGGER on_new_user_registration
  AFTER INSERT ON chat_users
  FOR EACH ROW EXECUTE FUNCTION notify_admin_new_registration();

-- ══════════════════════════════════════════════════════════════════════════════
-- DONE — new Frankfurt project fully configured
-- Next steps:
--   1. Copy API keys from Project Settings → API
--   2. Update .env.local (NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)
--   3. Update Vercel env vars
--   4. Run the data migration script (frankfurt_data_export.sql on OLD project,
--      then frankfurt_data_import.sql on NEW project)
--   5. Configure Auth → OAuth providers (Google) with new project's keys
--   6. Set Supabase Auth redirect URLs to your Vercel domain
-- ══════════════════════════════════════════════════════════════════════════════
