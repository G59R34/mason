-- Pricing page content tables
-- Run in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  price text NOT NULL,
  price_subtitle text,
  features text[] DEFAULT '{}',
  cta_label text,
  cta_plan text,
  cta_amount numeric,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pricing_page_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  subtitle text,
  custom_title text,
  custom_body text,
  custom_cta_label text,
  custom_cta_url text,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pricing_plans_sort_idx ON public.pricing_plans (sort_order);

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_page_content ENABLE ROW LEVEL SECURITY;

-- Public read for website
DROP POLICY IF EXISTS public_select_pricing_plans ON public.pricing_plans;
CREATE POLICY public_select_pricing_plans ON public.pricing_plans
  FOR SELECT USING (true);
DROP POLICY IF EXISTS public_select_pricing_page_content ON public.pricing_page_content;
CREATE POLICY public_select_pricing_page_content ON public.pricing_page_content
  FOR SELECT USING (true);
