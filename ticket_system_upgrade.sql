-- Ticket system upgrade: add subject/status metadata
-- Run in Supabase SQL editor

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

CREATE INDEX IF NOT EXISTS conversations_status_idx ON public.conversations (status);
CREATE INDEX IF NOT EXISTS conversations_last_message_idx ON public.conversations (last_message_at);
