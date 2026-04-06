-- Optional: enable Realtime for Masoncord messages (live updates in the app).
-- Run once in Supabase SQL editor. Safe to ignore if the table is already in the publication.

ALTER PUBLICATION supabase_realtime ADD TABLE public.masoncord_messages;
