-- Migration: convert reviews.rating to numeric(2,1) and allow 0/0.5..5.0
-- Run this in Supabase SQL Editor (admin/service_role) before deploying clients

-- 1) Drop any existing check constraints referencing rating
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint pc
    JOIN pg_class cl ON pc.conrelid = cl.oid
    JOIN pg_namespace ns ON cl.relnamespace = ns.oid
    JOIN unnest(pc.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = cl.oid AND a.attnum = ck.attnum
    WHERE cl.relname = 'reviews' AND a.attname = 'rating' AND pc.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.reviews DROP CONSTRAINT %I', c.conname);
  END LOOP;
END$$;

-- 2) Alter column type to numeric(2,1)
ALTER TABLE public.reviews ALTER COLUMN rating TYPE numeric(2,1) USING (rating::numeric);

-- 3) Add constraint to allow 0.0 - 5.0 in 0.5 increments
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_range CHECK (
  rating >= 0 AND rating <= 5 AND (rating * 2) = round(rating * 2)
);

-- 4) Verify
SELECT 'ok' WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='rating');
