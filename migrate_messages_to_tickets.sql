-- Migration: create tickets for existing messages and set ticket_id
-- Run this in Supabase SQL Editor. It will:
-- 1) Add `ticket_id` column to `messages` if missing
-- 2) Create a ticket for each message that lacks a ticket_id
-- 3) Update messages to reference the newly created ticket

BEGIN;

-- 1) Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='messages' AND column_name='ticket_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN ticket_id uuid;
  END IF;
END$$;

-- 2) Create tickets and update messages. This creates one ticket per message.
-- If you'd prefer grouping messages into tickets by user or subject, change the logic below.
DO $$
DECLARE
  r RECORD;
  new_id uuid;
BEGIN
  FOR r IN SELECT id, name, message FROM public.messages WHERE ticket_id IS NULL LOOP
    INSERT INTO public.tickets (subject, customer_name) VALUES (left(r.message, 80), r.name) RETURNING id INTO new_id;
    UPDATE public.messages SET ticket_id = new_id WHERE id = r.id;
  END LOOP;
END$$;

-- 3) (Optional) Add a foreign key constraint if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'messages' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'ticket_id'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_ticket_fk FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;
  END IF;
END$$;

COMMIT;

-- After running: verify with
-- SELECT COUNT(*) FROM public.messages WHERE ticket_id IS NULL;
-- If zero, migration succeeded.
