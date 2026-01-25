-- Add tables for review replies and review votes
CREATE TABLE IF NOT EXISTS public.review_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
  name text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.review_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
  voter text,
  vote smallint CHECK (vote IN (1,-1)),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_replies_review_idx ON public.review_replies (review_id);
CREATE INDEX IF NOT EXISTS review_votes_review_idx ON public.review_votes (review_id);

-- Public prototype policies (adjust for production)
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_insert_review_replies ON public.review_replies;
CREATE POLICY public_insert_review_replies ON public.review_replies FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS public_select_review_replies ON public.review_replies;
CREATE POLICY public_select_review_replies ON public.review_replies FOR SELECT USING (true);

DROP POLICY IF EXISTS public_insert_review_votes ON public.review_votes;
CREATE POLICY public_insert_review_votes ON public.review_votes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS public_select_review_votes ON public.review_votes;
CREATE POLICY public_select_review_votes ON public.review_votes FOR SELECT USING (true);
