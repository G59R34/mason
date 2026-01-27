-- Announcement static bar support
-- Run in Supabase SQL editor

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS is_static boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS announcements_static_idx ON public.announcements (is_static);

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS label text;

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS color text;
