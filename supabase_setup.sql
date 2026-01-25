-- Supabase setup SQL
-- Paste into Supabase SQL editor and run
-- Adjust table/column names if your app schema differs

-- 1) Enable UUID helper (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Reviews table
-- Simple table used by the reviews page
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  comment text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  t bigint, -- optional numeric timestamp (ms)
  owner uuid, -- optional: user id (auth.uid()) if you want per-user ownership
  created_at timestamptz DEFAULT now()
);

-- 3) Messages (chat) table
-- If a more advanced ticket system is desired, we create a tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text,
  customer_name text,
  status text DEFAULT 'open', -- open, closed
  assigned_admin text, -- free-form admin name or id
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
  name text,
  message text,
  sender_role text DEFAULT 'user', -- 'user' or 'admin'
  created_at timestamptz DEFAULT now()
);

-- 4) Indexes
CREATE INDEX IF NOT EXISTS reviews_created_idx ON public.reviews (created_at);
CREATE INDEX IF NOT EXISTS messages_created_idx ON public.messages (created_at);

-- 5) Row Level Security (RLS)
-- Enable RLS so policies are enforced. If you don't want RLS, skip enabling it.
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- -------------------------------
-- Option A: Quick public policies (convenient, NOT SECURE)
-- These allow anon/clients using the anon key to read/write/delete.
-- Use only for prototype or internal sites.

-- PostgreSQL doesn't support CREATE POLICY IF NOT EXISTS; drop then create to be idempotent
DROP POLICY IF EXISTS public_select_reviews ON public.reviews;
CREATE POLICY public_select_reviews ON public.reviews
  FOR SELECT USING (true);
DROP POLICY IF EXISTS public_insert_reviews ON public.reviews;
CREATE POLICY public_insert_reviews ON public.reviews
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS public_delete_reviews ON public.reviews;
CREATE POLICY public_delete_reviews ON public.reviews
  FOR DELETE USING (true);

DROP POLICY IF EXISTS public_select_messages ON public.messages;
CREATE POLICY public_select_messages ON public.messages
  FOR SELECT USING (true);
DROP POLICY IF EXISTS public_insert_messages ON public.messages;
CREATE POLICY public_insert_messages ON public.messages
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS public_delete_messages ON public.messages;
CREATE POLICY public_delete_messages ON public.messages
  FOR DELETE USING (true);

-- Tickets policies (public for prototype)
DROP POLICY IF EXISTS public_select_tickets ON public.tickets;
CREATE POLICY public_select_tickets ON public.tickets FOR SELECT USING (true);
DROP POLICY IF EXISTS public_insert_tickets ON public.tickets;
CREATE POLICY public_insert_tickets ON public.tickets FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS public_update_tickets ON public.tickets;
CREATE POLICY public_update_tickets ON public.tickets FOR UPDATE USING (true) WITH CHECK (true);

-- -------------------------------
-- Option B: Recommended secure policies (require authentication)
-- Uncomment and use these if you require users to be authenticated.
-- They assume Supabase auth is used on the client.

-- -- Reviews: authenticated users can SELECT and INSERT
-- CREATE POLICY auth_select_reviews ON public.reviews
--   FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY auth_insert_reviews ON public.reviews
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- -- (Optional) Only allow owner to DELETE or UPDATE
-- CREATE POLICY reviews_owner_modify ON public.reviews
--   FOR UPDATE, DELETE USING (owner = auth.uid());

-- -- Messages: authenticated users can SELECT and INSERT
-- CREATE POLICY auth_select_messages ON public.messages
--   FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY auth_insert_messages ON public.messages
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- CREATE POLICY messages_owner_modify ON public.messages
--   FOR UPDATE, DELETE USING (owner = auth.uid());

-- Note: When using owner-based policies, set the owner column on insert, for example
-- via a Postgres trigger or from server-side using service_role key. Client-side cannot safely set owner = auth.uid() unless you use RLS to enforce it.

-- -------------------------------
-- 6) Seed data (optional)
INSERT INTO public.reviews (name, comment, rating) VALUES
  ('Alex','Great work!',5),
  ('Sam','Good communication.',4)
ON CONFLICT DO NOTHING;

INSERT INTO public.messages (name, message) VALUES
  ('Visitor','Hello! I need help.'),
  ('Visitor','Is anyone there?')
ON CONFLICT DO NOTHING;

-- -------------------------------
-- 7) Cleanup helper (admin only - use service_role key)
-- Delete all messages (run from a trusted environment using service_role key)
-- DELETE FROM public.messages;
-- DELETE FROM public.reviews;

-- End of file
