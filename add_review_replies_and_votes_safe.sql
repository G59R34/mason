-- Safe migration: create review_replies and review_votes using the same type as reviews.id
-- Run this in Supabase SQL Editor (admin/service_role).

DO $$
DECLARE
  review_id_type text;
BEGIN
  SELECT pg_catalog.format_type(a.atttypid, a.atttypmod)
    INTO review_id_type
  FROM pg_attribute a
  JOIN pg_class c ON a.attrelid = c.oid
  WHERE c.relname = 'reviews' AND a.attname = 'id';

  IF review_id_type IS NULL THEN
    RAISE EXCEPTION 'Could not detect reviews.id type. Ensure table public.reviews exists.';
  END IF;

  RAISE NOTICE 'Detected reviews.id type: %', review_id_type;

  -- Create replies table with review_id using the detected type
  EXECUTE format('CREATE TABLE IF NOT EXISTS public.review_replies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id %s REFERENCES public.reviews(id) ON DELETE CASCADE,
    name text,
    message text NOT NULL,
    created_at timestamptz DEFAULT now()
  );', review_id_type);

  -- Create votes table with review_id using the detected type
  EXECUTE format('CREATE TABLE IF NOT EXISTS public.review_votes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id %s REFERENCES public.reviews(id) ON DELETE CASCADE,
    voter text,
    vote smallint CHECK (vote IN (1,-1)),
    created_at timestamptz DEFAULT now()
  );', review_id_type);

  -- Indexes
  EXECUTE 'CREATE INDEX IF NOT EXISTS review_replies_review_idx ON public.review_replies (review_id);';
  EXECUTE 'CREATE INDEX IF NOT EXISTS review_votes_review_idx ON public.review_votes (review_id);';

END$$;

-- Policies and RLS (prototype permissive policies)
ALTER TABLE IF EXISTS public.review_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.review_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_insert_review_replies ON public.review_replies;
CREATE POLICY public_insert_review_replies ON public.review_replies FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS public_select_review_replies ON public.review_replies;
CREATE POLICY public_select_review_replies ON public.review_replies FOR SELECT USING (true);

DROP POLICY IF EXISTS public_insert_review_votes ON public.review_votes;
CREATE POLICY public_insert_review_votes ON public.review_votes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS public_select_review_votes ON public.review_votes;
CREATE POLICY public_select_review_votes ON public.review_votes FOR SELECT USING (true);
