-- Fix: infinite recursion in policy for masoncord_server_members
-- Run once in Supabase SQL editor if you already applied the old masoncord_setup.sql.
-- Safe to re-run.

DROP POLICY IF EXISTS masoncord_members_select ON public.masoncord_server_members;

CREATE POLICY masoncord_members_select ON public.masoncord_server_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
