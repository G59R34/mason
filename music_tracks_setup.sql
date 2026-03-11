-- Music player storage + content tables
-- Run in Supabase SQL editor (after gallery_setup.sql; uses same is_admin() if present)

-- Storage bucket for MP3s
INSERT INTO storage.buckets (id, name, public)
VALUES ('music', 'music', true)
ON CONFLICT (id) DO NOTHING;

-- Tracks table
CREATE TABLE IF NOT EXISTS public.music_tracks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  artist text,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  sort_order int DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS music_tracks_sort_idx ON public.music_tracks (sort_order);

ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- Public read
DROP POLICY IF EXISTS public_select_music_tracks ON public.music_tracks;
CREATE POLICY public_select_music_tracks ON public.music_tracks
  FOR SELECT USING (true);

-- Admin write
DROP POLICY IF EXISTS admin_insert_music_tracks ON public.music_tracks;
CREATE POLICY admin_insert_music_tracks ON public.music_tracks
  FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS admin_update_music_tracks ON public.music_tracks;
CREATE POLICY admin_update_music_tracks ON public.music_tracks
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS admin_delete_music_tracks ON public.music_tracks;
CREATE POLICY admin_delete_music_tracks ON public.music_tracks
  FOR DELETE USING (public.is_admin());

-- Storage policies for music bucket
DROP POLICY IF EXISTS public_read_music ON storage.objects;
CREATE POLICY public_read_music ON storage.objects
  FOR SELECT USING (bucket_id = 'music');

DROP POLICY IF EXISTS admin_write_music ON storage.objects;
CREATE POLICY admin_write_music ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'music' AND public.is_admin());

DROP POLICY IF EXISTS admin_update_music ON storage.objects;
CREATE POLICY admin_update_music ON storage.objects
  FOR UPDATE USING (bucket_id = 'music' AND public.is_admin());

DROP POLICY IF EXISTS admin_delete_music ON storage.objects;
CREATE POLICY admin_delete_music ON storage.objects
  FOR DELETE USING (bucket_id = 'music' AND public.is_admin());
