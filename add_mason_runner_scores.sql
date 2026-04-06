-- Mason Runner (Chrome-style) global leaderboard
-- Run in Supabase SQL Editor after other public tables.

CREATE TABLE IF NOT EXISTS public.mason_runner_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text NOT NULL CHECK (char_length(trim(player_name)) BETWEEN 1 AND 32),
  score integer NOT NULL CHECK (score >= 0 AND score <= 2000000),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mason_runner_scores_top_idx ON public.mason_runner_scores (score DESC, created_at ASC);

ALTER TABLE public.mason_runner_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mason_runner_scores_select ON public.mason_runner_scores;
CREATE POLICY mason_runner_scores_select ON public.mason_runner_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS mason_runner_scores_insert ON public.mason_runner_scores;
CREATE POLICY mason_runner_scores_insert ON public.mason_runner_scores FOR INSERT WITH CHECK (true);

-- Optional: allow users to update only their row — not needed for arcade high scores

COMMENT ON TABLE public.mason_runner_scores IS 'Global leaderboard for Mason Runner game (mason-web)';

-- Optional: enable live leaderboard updates in the app — Supabase Dashboard → Database → Publications
-- → enable replica for table mason_runner_scores (or run: alter publication supabase_realtime add table public.mason_runner_scores;)
