-- Track reviews: same pattern as site reviews, keyed by track_slug (e.g. 'nutforme')
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.track_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  track_slug text NOT NULL,
  name text NOT NULL,
  comment text NOT NULL,
  rating numeric(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS track_reviews_slug_created_idx ON public.track_reviews (track_slug, created_at DESC);

ALTER TABLE public.track_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_select_track_reviews ON public.track_reviews;
CREATE POLICY public_select_track_reviews ON public.track_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS public_insert_track_reviews ON public.track_reviews;
CREATE POLICY public_insert_track_reviews ON public.track_reviews FOR INSERT WITH CHECK (true);
