-- Mason Portal: conversations, announcements, sessions, reviews, and account support
-- Run in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Profiles (optional)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON public.user_profiles (email);

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender text,
  body text,
  sender_role text DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversation_messages_created_idx ON public.conversation_messages (created_at);

-- Sessions (bookings)
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text,
  contact text,
  details text,
  location text,
  duration_minutes int,
  price numeric,
  scheduled_for timestamptz,
  status text DEFAULT 'requested',
  admin_feedback text,
  admin_message text,
  admin_message_sent_at timestamptz,
  session_chat_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  staff_name text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_created_idx ON public.sessions (created_at);

-- Staff directory (assignable to sessions)
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_name_idx ON public.staff (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS staff_name_trim_idx ON public.staff (lower(trim(name)));
CREATE INDEX IF NOT EXISTS staff_sort_idx ON public.staff (sort_order);
CREATE INDEX IF NOT EXISTS staff_user_id_idx ON public.staff (user_id);

-- Announcements (if not already present)
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_created_idx ON public.announcements (created_at);

-- Reviews table (if not already present)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  comment text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 0 AND 5),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_created_idx ON public.reviews (created_at);

-- Calls (browser-to-browser WebRTC signaling)
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  status text DEFAULT 'calling',
  started_by_role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.call_signals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id uuid REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  sender_role text,
  signal_type text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS call_sessions_created_idx ON public.call_sessions (created_at);
CREATE INDEX IF NOT EXISTS call_signals_created_idx ON public.call_signals (created_at);

-- Add missing columns if tables already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sessions' AND column_name='location'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN location text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sessions' AND column_name='duration_minutes'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN duration_minutes int;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sessions' AND column_name='price'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN price numeric;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sessions' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sessions' AND column_name='admin_feedback'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN admin_feedback text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sessions' AND column_name='admin_message'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN admin_message text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sessions' AND column_name='admin_message_sent_at'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN admin_message_sent_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sessions' AND column_name='session_chat_id'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN session_chat_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sessions' AND column_name='staff_name'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN staff_name text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='staff' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.staff ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_profiles' AND column_name='email'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN email text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='conversations' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.conversations ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END$$;


-- Add mason_reply column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reviews' AND column_name='mason_reply'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN mason_reply text;
  END IF;
END$$;

-- RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Normalize staff names on insert/update
CREATE OR REPLACE FUNCTION public.staff_normalize_name()
RETURNS trigger AS $$
BEGIN
  NEW.name := trim(NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS staff_normalize_name ON public.staff;
CREATE TRIGGER staff_normalize_name
BEFORE INSERT OR UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.staff_normalize_name();

-- Public policies (prototype / internal use only)
DROP POLICY IF EXISTS public_select_conversations ON public.conversations;
CREATE POLICY public_select_conversations ON public.conversations FOR SELECT USING (true);
DROP POLICY IF EXISTS public_insert_conversations ON public.conversations;
CREATE POLICY public_insert_conversations ON public.conversations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS public_update_conversations ON public.conversations;
CREATE POLICY public_update_conversations ON public.conversations FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_select_conversation_messages ON public.conversation_messages;
CREATE POLICY public_select_conversation_messages ON public.conversation_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS public_insert_conversation_messages ON public.conversation_messages;
CREATE POLICY public_insert_conversation_messages ON public.conversation_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS public_select_sessions ON public.sessions;
CREATE POLICY public_select_sessions ON public.sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS public_insert_sessions ON public.sessions;
CREATE POLICY public_insert_sessions ON public.sessions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS public_update_sessions ON public.sessions;
CREATE POLICY public_update_sessions ON public.sessions FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS public_delete_sessions ON public.sessions;
CREATE POLICY public_delete_sessions ON public.sessions FOR DELETE USING (true);

-- Staff can view/update sessions assigned to them
DROP POLICY IF EXISTS staff_select_assigned_sessions ON public.sessions;
CREATE POLICY staff_select_assigned_sessions ON public.sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = auth.uid()
      AND lower(trim(s.name)) = lower(trim(staff_name))
  )
);

DROP POLICY IF EXISTS staff_update_assigned_sessions ON public.sessions;
CREATE POLICY staff_update_assigned_sessions ON public.sessions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = auth.uid()
      AND lower(trim(s.name)) = lower(trim(staff_name))
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = auth.uid()
      AND lower(trim(s.name)) = lower(trim(staff_name))
  )
);

DROP POLICY IF EXISTS public_select_announcements ON public.announcements;
CREATE POLICY public_select_announcements ON public.announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS public_insert_announcements ON public.announcements;
CREATE POLICY public_insert_announcements ON public.announcements FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS public_delete_announcements ON public.announcements;
CREATE POLICY public_delete_announcements ON public.announcements FOR DELETE USING (true);

DROP POLICY IF EXISTS public_select_staff ON public.staff;
CREATE POLICY public_select_staff ON public.staff FOR SELECT USING (true);
DROP POLICY IF EXISTS public_insert_staff ON public.staff;
CREATE POLICY public_insert_staff ON public.staff FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS public_update_staff ON public.staff;
CREATE POLICY public_update_staff ON public.staff FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS public_delete_staff ON public.staff;
CREATE POLICY public_delete_staff ON public.staff FOR DELETE USING (true);

DROP POLICY IF EXISTS staff_select_self ON public.staff;
CREATE POLICY staff_select_self ON public.staff
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS staff_update_self ON public.staff;
CREATE POLICY staff_update_self ON public.staff
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS public_select_reviews ON public.reviews;
CREATE POLICY public_select_reviews ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS public_insert_reviews ON public.reviews;
CREATE POLICY public_insert_reviews ON public.reviews FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS public_update_reviews ON public.reviews;
CREATE POLICY public_update_reviews ON public.reviews FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS public_delete_reviews ON public.reviews;
CREATE POLICY public_delete_reviews ON public.reviews FOR DELETE USING (true);

-- Call policies (prototype / internal use only)
DROP POLICY IF EXISTS public_select_call_sessions ON public.call_sessions;
CREATE POLICY public_select_call_sessions ON public.call_sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS public_insert_call_sessions ON public.call_sessions;
CREATE POLICY public_insert_call_sessions ON public.call_sessions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS public_update_call_sessions ON public.call_sessions;
CREATE POLICY public_update_call_sessions ON public.call_sessions FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_select_call_signals ON public.call_signals;
CREATE POLICY public_select_call_signals ON public.call_signals FOR SELECT USING (true);
DROP POLICY IF EXISTS public_insert_call_signals ON public.call_signals;
CREATE POLICY public_insert_call_signals ON public.call_signals FOR INSERT WITH CHECK (true);

-- Authenticated user policies (for account portal)
DROP POLICY IF EXISTS user_select_own_sessions ON public.sessions;
CREATE POLICY user_select_own_sessions ON public.sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS user_insert_own_sessions ON public.sessions;
CREATE POLICY user_insert_own_sessions ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_update_own_sessions ON public.sessions;
CREATE POLICY user_update_own_sessions ON public.sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_select_own_profile ON public.user_profiles;
CREATE POLICY user_select_own_profile ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS public_select_user_profiles ON public.user_profiles;
CREATE POLICY public_select_user_profiles ON public.user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS user_upsert_own_profile ON public.user_profiles;
CREATE POLICY user_upsert_own_profile ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_update_own_profile ON public.user_profiles;
CREATE POLICY user_update_own_profile ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
