-- Public session schedule for mason-web /schedule (booking-facing fields).
-- Run in Supabase after supabase_mason_portal.sql. Re-run to replace the view after changes.
--
-- Excludes internal-only columns: admin_feedback, admin_message, admin_message_sent_at, session_chat_id, user_id

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'session_type'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN session_type text;
  END IF;
END $$;

DROP VIEW IF EXISTS public.session_schedule_public;

CREATE VIEW public.session_schedule_public AS
SELECT
  s.id,
  s.customer_name,
  s.contact,
  s.details,
  s.location,
  s.duration_minutes,
  s.price,
  s.scheduled_for,
  s.status,
  s.staff_name,
  s.session_type,
  s.created_at
FROM public.sessions s
WHERE s.scheduled_for IS NOT NULL
  AND COALESCE(s.status, '') NOT IN ('denied');

COMMENT ON VIEW public.session_schedule_public IS 'Public Mason session rows for mason-web schedule (no admin/chat/user_id).';

GRANT SELECT ON public.session_schedule_public TO anon, authenticated;
