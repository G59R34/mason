-- Why Mason content tables for website + admin editing
-- Run in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.why_value_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.why_quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote text NOT NULL,
  author text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS why_value_cards_sort_idx ON public.why_value_cards (sort_order);
CREATE INDEX IF NOT EXISTS why_quotes_sort_idx ON public.why_quotes (sort_order);

ALTER TABLE public.why_value_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.why_quotes ENABLE ROW LEVEL SECURITY;

-- Public read for website
DROP POLICY IF EXISTS public_select_why_value_cards ON public.why_value_cards;
CREATE POLICY public_select_why_value_cards ON public.why_value_cards
  FOR SELECT USING (true);
DROP POLICY IF EXISTS public_select_why_quotes ON public.why_quotes;
CREATE POLICY public_select_why_quotes ON public.why_quotes
  FOR SELECT USING (true);
