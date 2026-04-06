-- Add public URL rows if missing (existing projects). Safe to re-run.
INSERT INTO public.site_settings (key, value)
VALUES ('main_site_url', '{"url": "https://sexwithmason.com"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('masoncord_url', '{"url": "https://cord.sexwithmason.com"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
