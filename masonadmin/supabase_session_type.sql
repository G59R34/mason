-- Optional: add session/appointment type (e.g. Cleaning, Checkup, Follow-up)
-- Run in Supabase SQL editor if you want to use the Session type field.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'session_type'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN session_type text;
  END IF;
END $$;
