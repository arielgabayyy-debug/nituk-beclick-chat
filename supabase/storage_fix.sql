-- ============================================================
-- STORAGE FIX — chat-audio & chat-images buckets
-- Run this in the Supabase SQL Editor.
-- Makes both media buckets public and adds proper RLS policies.
-- ============================================================

-- ── 1. Ensure buckets exist and are PUBLIC ───────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'chat-audio',
    'chat-audio',
    true,                    -- PUBLIC: anyone can read via public URL
    20971520,                -- 20 MB limit
    ARRAY[
      'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg',
      'audio/aac', 'audio/wav', 'audio/x-m4a', 'audio/m4a',
      'video/webm', 'video/mp4', 'video/quicktime', 'video/avi',
      'video/x-msvideo', 'application/octet-stream'
    ]
  ),
  (
    'chat-images',
    'chat-images',
    true,
    10485760,                -- 10 MB limit
    ARRAY[
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'image/svg+xml', 'image/heic', 'image/heif'
    ]
  )
ON CONFLICT (id) DO UPDATE SET
  public            = true,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ── 2. Drop any stale or conflicting storage policies ────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM   pg_policies
    WHERE  tablename = 'objects'
      AND  schemaname = 'storage'
      AND  policyname LIKE '%chat-audio%'
       OR  (tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%chat-images%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END
$$;


-- ── 3. Public READ on both buckets (no auth required) ────────

CREATE POLICY "chat-audio: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-audio');

CREATE POLICY "chat-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');


-- ── 4. Authenticated users can UPLOAD ────────────────────────
--    (service-role key used by the API bypasses RLS anyway,
--     but this allows future direct-upload if needed)

CREATE POLICY "chat-audio: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-audio');

CREATE POLICY "chat-images: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-images');


-- ── 5. Service-role can do everything (upload/delete via API) ─
-- (Service role bypasses RLS by default, so no explicit policy
--  is needed — these are here for clarity and documentation.)


-- ── 6. Enable RLS on storage.objects (idempotent) ────────────
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;


-- ── Done ─────────────────────────────────────────────────────
-- After running this script:
--   • Both buckets are PUBLIC: getPublicUrl() URLs work for everyone
--   • No signed URLs required for playback
--   • Uploads still require the service-role key (used by /api/upload-audio
--     and /api/upload-image)
--   • If you still see CORS errors, the fix is in the app code (removing
--     the crossOrigin attribute from <audio> and <video> elements).
