-- Create an `admins` table and add `owner` columns to replies/votes if missing
-- Run in Supabase SQL editor (requires admin/service_role)

-- 1) Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY,
  display_name text,
  created_at timestamptz DEFAULT now()
);

-- 1b) Allow public read so everyone can see admin badges
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admins_public_select ON public.admins;
CREATE POLICY admins_public_select ON public.admins
  FOR SELECT USING (true);

-- 2) Add owner columns to reviews/replies/votes (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='reviews' AND table_schema='public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='owner') THEN
      EXECUTE 'ALTER TABLE public.reviews ADD COLUMN owner uuid';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='review_replies' AND table_schema='public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='review_replies' AND column_name='owner') THEN
      EXECUTE 'ALTER TABLE public.review_replies ADD COLUMN owner uuid';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='review_votes' AND table_schema='public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='review_votes' AND column_name='owner') THEN
      EXECUTE 'ALTER TABLE public.review_votes ADD COLUMN owner uuid';
    END IF;
  END IF;
END$$;
