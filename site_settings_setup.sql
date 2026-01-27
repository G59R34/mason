-- Site settings for public website features
-- Run in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public read
DROP POLICY IF EXISTS public_select_site_settings ON public.site_settings;
CREATE POLICY public_select_site_settings ON public.site_settings
  FOR SELECT USING (true);

-- Admin write
DROP POLICY IF EXISTS admin_upsert_site_settings ON public.site_settings;
CREATE POLICY admin_upsert_site_settings ON public.site_settings
  FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS admin_update_site_settings ON public.site_settings;
CREATE POLICY admin_update_site_settings ON public.site_settings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed defaults (optional)
INSERT INTO public.site_settings (key, value)
VALUES ('maintenance_mode', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('physics_mode', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('intro_loop', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('jumpscare', '{"enabled": false, "nonce": 0}'::jsonb)
ON CONFLICT (key) DO NOTHING;
