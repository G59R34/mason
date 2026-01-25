-- Fix foreign key type mismatch for review_replies and review_votes
-- This migration detects the current data type of public.reviews.id and
-- converts review_replies.review_id and review_votes.review_id to match,
-- then recreates the foreign key constraints.

-- Run this in Supabase SQL Editor (admin/service_role). It is safe to re-run.

DO $$
DECLARE
  review_id_type text;
BEGIN
  -- detect the SQL type of reviews.id
  SELECT pg_catalog.format_type(a.atttypid, a.atttypmod)
  INTO review_id_type
  FROM pg_attribute a
  JOIN pg_class c ON a.attrelid = c.oid
  WHERE c.relname = 'reviews' AND a.attname = 'id';

  IF review_id_type IS NULL THEN
    RAISE EXCEPTION 'Could not determine type of reviews.id';
  END IF;

  RAISE NOTICE 'reviews.id type = %', review_id_type;

  -- Drop existing foreign keys if present
  ALTER TABLE IF EXISTS public.review_replies DROP CONSTRAINT IF EXISTS review_replies_review_id_fkey;
  ALTER TABLE IF EXISTS public.review_votes DROP CONSTRAINT IF EXISTS review_votes_review_id_fkey;

  -- If the tables/columns exist, alter the column types to match reviews.id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='review_replies' AND column_name='review_id') THEN
    EXECUTE format('ALTER TABLE public.review_replies ALTER COLUMN review_id TYPE %s USING review_id::%s', review_id_type, review_id_type);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='review_votes' AND column_name='review_id') THEN
    EXECUTE format('ALTER TABLE public.review_votes ALTER COLUMN review_id TYPE %s USING review_id::%s', review_id_type, review_id_type);
  END IF;

  -- Recreate foreign key constraints referencing reviews(id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='review_replies') THEN
    EXECUTE 'ALTER TABLE public.review_replies ADD CONSTRAINT review_replies_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='review_votes') THEN
    EXECUTE 'ALTER TABLE public.review_votes ADD CONSTRAINT review_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE';
  END IF;

END$$;

-- Optional: If you prefer the new tables to be recreated from scratch (if they were created with wrong type),
-- drop them and re-run the add_review_replies_and_votes.sql which will create them with the correct types.
