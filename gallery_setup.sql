-- Gallery storage + content tables
-- Run in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Gallery table
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  caption text,
  sort_order int DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gallery_images_sort_idx ON public.gallery_images (sort_order);

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Public read
DROP POLICY IF EXISTS public_select_gallery_images ON public.gallery_images;
CREATE POLICY public_select_gallery_images ON public.gallery_images
  FOR SELECT USING (true);

-- Admin write
DROP POLICY IF EXISTS admin_insert_gallery_images ON public.gallery_images;
CREATE POLICY admin_insert_gallery_images ON public.gallery_images
  FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS admin_update_gallery_images ON public.gallery_images;
CREATE POLICY admin_update_gallery_images ON public.gallery_images
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS admin_delete_gallery_images ON public.gallery_images;
CREATE POLICY admin_delete_gallery_images ON public.gallery_images
  FOR DELETE USING (public.is_admin());

-- Storage policies
DROP POLICY IF EXISTS public_read_gallery ON storage.objects;
CREATE POLICY public_read_gallery ON storage.objects
  FOR SELECT USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS admin_write_gallery ON storage.objects;
CREATE POLICY admin_write_gallery ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'gallery' AND public.is_admin());

DROP POLICY IF EXISTS admin_update_gallery ON storage.objects;
CREATE POLICY admin_update_gallery ON storage.objects
  FOR UPDATE USING (bucket_id = 'gallery' AND public.is_admin());

DROP POLICY IF EXISTS admin_delete_gallery ON storage.objects;
CREATE POLICY admin_delete_gallery ON storage.objects
  FOR DELETE USING (bucket_id = 'gallery' AND public.is_admin());
