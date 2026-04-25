-- Mason Reels: user-uploaded short videos (Supabase Auth + Storage)
-- Run in Supabase SQL Editor after supabase_mason_portal.sql.
-- Requires: public schema, auth.users

-- 1) Table
CREATE TABLE IF NOT EXISTS public.mason_reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  caption text,
  -- Path inside bucket "mason-reels" (e.g. "uuid/filename.mp4")
  video_path text NOT NULL,
  -- Optional future use; can store separate thumbnail object path
  poster_path text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('pending', 'published', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mason_reels_created_idx ON public.mason_reels (created_at DESC);
CREATE INDEX IF NOT EXISTS mason_reels_user_idx ON public.mason_reels (user_id);

CREATE OR REPLACE FUNCTION public.mason_reels_set_updated()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mason_reels_updated ON public.mason_reels;
CREATE TRIGGER mason_reels_updated
BEFORE UPDATE ON public.mason_reels
FOR EACH ROW
EXECUTE FUNCTION public.mason_reels_set_updated();

ALTER TABLE public.mason_reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mason_reels_select ON public.mason_reels;
CREATE POLICY mason_reels_select ON public.mason_reels
FOR SELECT
USING (status = 'published' OR auth.uid() = user_id);

DROP POLICY IF EXISTS mason_reels_insert ON public.mason_reels;
CREATE POLICY mason_reels_insert ON public.mason_reels
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS mason_reels_update ON public.mason_reels;
CREATE POLICY mason_reels_update ON public.mason_reels
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS mason_reels_delete ON public.mason_reels;
CREATE POLICY mason_reels_delete ON public.mason_reels
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 2) Storage bucket (100 MB, short video types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mason-reels',
  'mason-reels',
  true,
  104857600,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3) Storage RLS
DROP POLICY IF EXISTS "mason_reels_public_read" ON storage.objects;
CREATE POLICY "mason_reels_public_read" ON storage.objects
FOR SELECT
USING (bucket_id = 'mason-reels');

DROP POLICY IF EXISTS "mason_reels_authenticated_insert" ON storage.objects;
CREATE POLICY "mason_reels_authenticated_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'mason-reels'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "mason_reels_authenticated_update" ON storage.objects;
CREATE POLICY "mason_reels_authenticated_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'mason-reels'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'mason-reels'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "mason_reels_authenticated_delete" ON storage.objects;
CREATE POLICY "mason_reels_authenticated_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'mason-reels'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
