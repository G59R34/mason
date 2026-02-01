-- Mason Admin: admin gating + RLS helper
-- Run in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Admins table (if missing)
CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_self_select ON public.admins;
CREATE POLICY admin_self_select ON public.admins
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS admin_self_upsert ON public.admins;
CREATE POLICY admin_self_upsert ON public.admins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS admin_self_update ON public.admins;
CREATE POLICY admin_self_update ON public.admins
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helper function to check admin access
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Admin-only policies (additive; do not remove existing public policies)
DROP POLICY IF EXISTS admin_select_announcements ON public.announcements;
CREATE POLICY admin_select_announcements ON public.announcements
  FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS admin_insert_announcements ON public.announcements;
CREATE POLICY admin_insert_announcements ON public.announcements
  FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS admin_delete_announcements ON public.announcements;
CREATE POLICY admin_delete_announcements ON public.announcements
  FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_select_conversations ON public.conversations;
CREATE POLICY admin_select_conversations ON public.conversations
  FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS admin_update_conversations ON public.conversations;
CREATE POLICY admin_update_conversations ON public.conversations
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS admin_delete_conversations ON public.conversations;
CREATE POLICY admin_delete_conversations ON public.conversations
  FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_select_conversation_messages ON public.conversation_messages;
CREATE POLICY admin_select_conversation_messages ON public.conversation_messages
  FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS admin_insert_conversation_messages ON public.conversation_messages;
CREATE POLICY admin_insert_conversation_messages ON public.conversation_messages
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_select_reviews ON public.reviews;
CREATE POLICY admin_select_reviews ON public.reviews
  FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS admin_update_reviews ON public.reviews;
CREATE POLICY admin_update_reviews ON public.reviews
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS admin_delete_reviews ON public.reviews;
CREATE POLICY admin_delete_reviews ON public.reviews
  FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_select_sessions ON public.sessions;
CREATE POLICY admin_select_sessions ON public.sessions
  FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS admin_insert_sessions ON public.sessions;
CREATE POLICY admin_insert_sessions ON public.sessions
  FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS admin_update_sessions ON public.sessions;
CREATE POLICY admin_update_sessions ON public.sessions
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS admin_delete_sessions ON public.sessions;
CREATE POLICY admin_delete_sessions ON public.sessions
  FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_select_user_profiles ON public.user_profiles;
CREATE POLICY admin_select_user_profiles ON public.user_profiles
  FOR SELECT USING (public.is_admin());
