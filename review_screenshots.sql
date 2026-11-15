-- Adds the screenshot column used by Mason Bot reviews.
-- Run once in the Supabase SQL editor.
--
-- The `review-shots` storage bucket is created automatically by the
-- smooth-service edge function (it has the service role key) on the first
-- review that carries a screenshot, so there is no bucket setup here.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS screenshot_url text;

-- Sanity check
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'reviews'
ORDER BY ordinal_position;
