-- Forums feature setup for Supabase
-- Run this in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.forums_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  author_name text,
  owner uuid,
  verified boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  reply_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forums_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.forums_threads(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_name text,
  owner uuid,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forums_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES public.forums_threads(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.forums_replies(id) ON DELETE CASCADE,
  voter_key text NOT NULL,
  owner uuid,
  vote smallint NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forums_votes_target_check CHECK (
    (thread_id IS NOT NULL AND reply_id IS NULL) OR
    (thread_id IS NULL AND reply_id IS NOT NULL)
  ),
  CONSTRAINT forums_votes_thread_unique UNIQUE (thread_id, voter_key),
  CONSTRAINT forums_votes_reply_unique UNIQUE (reply_id, voter_key)
);

CREATE INDEX IF NOT EXISTS forums_threads_created_idx ON public.forums_threads (created_at DESC);
CREATE INDEX IF NOT EXISTS forums_threads_category_idx ON public.forums_threads (category);
CREATE INDEX IF NOT EXISTS forums_threads_owner_idx ON public.forums_threads (owner);
CREATE INDEX IF NOT EXISTS forums_replies_thread_idx ON public.forums_replies (thread_id, created_at);
CREATE INDEX IF NOT EXISTS forums_votes_thread_idx ON public.forums_votes (thread_id);
CREATE INDEX IF NOT EXISTS forums_votes_reply_idx ON public.forums_votes (reply_id);

CREATE OR REPLACE FUNCTION public.forums_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS forums_threads_set_updated_at ON public.forums_threads;
CREATE TRIGGER forums_threads_set_updated_at
BEFORE UPDATE ON public.forums_threads
FOR EACH ROW EXECUTE FUNCTION public.forums_set_updated_at();

DROP TRIGGER IF EXISTS forums_votes_set_updated_at ON public.forums_votes;
CREATE TRIGGER forums_votes_set_updated_at
BEFORE UPDATE ON public.forums_votes
FOR EACH ROW EXECUTE FUNCTION public.forums_set_updated_at();

CREATE OR REPLACE FUNCTION public.forums_refresh_reply_count()
RETURNS trigger AS $$
DECLARE
  target_thread uuid;
BEGIN
  target_thread := COALESCE(NEW.thread_id, OLD.thread_id);
  UPDATE public.forums_threads
  SET
    reply_count = (
      SELECT count(*)
      FROM public.forums_replies r
      WHERE r.thread_id = target_thread
    ),
    updated_at = now()
  WHERE id = target_thread;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS forums_replies_refresh_count_insert ON public.forums_replies;
CREATE TRIGGER forums_replies_refresh_count_insert
AFTER INSERT ON public.forums_replies
FOR EACH ROW EXECUTE FUNCTION public.forums_refresh_reply_count();

DROP TRIGGER IF EXISTS forums_replies_refresh_count_delete ON public.forums_replies;
CREATE TRIGGER forums_replies_refresh_count_delete
AFTER DELETE ON public.forums_replies
FOR EACH ROW EXECUTE FUNCTION public.forums_refresh_reply_count();

ALTER TABLE public.forums_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forums_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forums_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forums_threads_public_select ON public.forums_threads;
CREATE POLICY forums_threads_public_select ON public.forums_threads
FOR SELECT USING (true);

DROP POLICY IF EXISTS forums_threads_public_insert ON public.forums_threads;
CREATE POLICY forums_threads_public_insert ON public.forums_threads
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS forums_threads_public_update ON public.forums_threads;
CREATE POLICY forums_threads_public_update ON public.forums_threads
FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS forums_replies_public_select ON public.forums_replies;
CREATE POLICY forums_replies_public_select ON public.forums_replies
FOR SELECT USING (true);

DROP POLICY IF EXISTS forums_replies_public_insert ON public.forums_replies;
CREATE POLICY forums_replies_public_insert ON public.forums_replies
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS forums_replies_public_delete ON public.forums_replies;
CREATE POLICY forums_replies_public_delete ON public.forums_replies
FOR DELETE USING (true);

DROP POLICY IF EXISTS forums_votes_public_select ON public.forums_votes;
CREATE POLICY forums_votes_public_select ON public.forums_votes
FOR SELECT USING (true);

DROP POLICY IF EXISTS forums_votes_public_insert ON public.forums_votes;
CREATE POLICY forums_votes_public_insert ON public.forums_votes
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS forums_votes_public_update ON public.forums_votes;
CREATE POLICY forums_votes_public_update ON public.forums_votes
FOR UPDATE USING (true) WITH CHECK (true);

INSERT INTO public.forums_threads (title, body, category, author_name, verified)
SELECT
  'Welcome to Forums',
  'Post questions, share updates, and reply to each other here.',
  'general',
  'Mason',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.forums_threads);
