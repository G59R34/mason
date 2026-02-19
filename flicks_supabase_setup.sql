-- Flicks feature setup for Supabase
-- Run this in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.flicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caption text,
  video_path text NOT NULL,
  author_name text,
  user_device text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flick_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flick_id uuid NOT NULL REFERENCES public.flicks(id) ON DELETE CASCADE,
  user_device text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT flick_likes_unique UNIQUE (flick_id, user_device)
);

CREATE TABLE IF NOT EXISTS public.flick_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flick_id uuid NOT NULL REFERENCES public.flicks(id) ON DELETE CASCADE,
  author_name text,
  body text NOT NULL,
  user_device text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flicks_created_idx ON public.flicks (created_at DESC);
CREATE INDEX IF NOT EXISTS flick_likes_flick_idx ON public.flick_likes (flick_id);
CREATE INDEX IF NOT EXISTS flick_comments_flick_idx ON public.flick_comments (flick_id);
CREATE INDEX IF NOT EXISTS flick_comments_created_idx ON public.flick_comments (created_at DESC);

ALTER TABLE public.flicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flick_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flick_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_select_flicks ON public.flicks;
CREATE POLICY public_select_flicks ON public.flicks
FOR SELECT USING (true);

DROP POLICY IF EXISTS public_insert_flicks ON public.flicks;
CREATE POLICY public_insert_flicks ON public.flicks
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS public_select_flick_likes ON public.flick_likes;
CREATE POLICY public_select_flick_likes ON public.flick_likes
FOR SELECT USING (true);

DROP POLICY IF EXISTS public_insert_flick_likes ON public.flick_likes;
CREATE POLICY public_insert_flick_likes ON public.flick_likes
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS public_delete_flick_likes ON public.flick_likes;
CREATE POLICY public_delete_flick_likes ON public.flick_likes
FOR DELETE USING (true);

DROP POLICY IF EXISTS public_select_flick_comments ON public.flick_comments;
CREATE POLICY public_select_flick_comments ON public.flick_comments
FOR SELECT USING (true);

DROP POLICY IF EXISTS public_insert_flick_comments ON public.flick_comments;
CREATE POLICY public_insert_flick_comments ON public.flick_comments
FOR INSERT WITH CHECK (true);

-- Storage bucket for vertical videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('flicks', 'flicks', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage object policies (public read + upload/delete for prototype)
DROP POLICY IF EXISTS "Public read flicks videos" ON storage.objects;
CREATE POLICY "Public read flicks videos" ON storage.objects
FOR SELECT USING (bucket_id = 'flicks');

DROP POLICY IF EXISTS "Public upload flicks videos" ON storage.objects;
CREATE POLICY "Public upload flicks videos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'flicks');

DROP POLICY IF EXISTS "Public update flicks videos" ON storage.objects;
CREATE POLICY "Public update flicks videos" ON storage.objects
FOR UPDATE USING (bucket_id = 'flicks') WITH CHECK (bucket_id = 'flicks');

DROP POLICY IF EXISTS "Public delete flicks videos" ON storage.objects;
CREATE POLICY "Public delete flicks videos" ON storage.objects
FOR DELETE USING (bucket_id = 'flicks');
