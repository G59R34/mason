-- Masoncord v2: replies, member list RPC, reply validation trigger
-- Run in Supabase SQL editor (safe to re-run).

-- ---------------------------------------------------------------------------
-- Replies: optional parent message (must stay in same channel)
-- ---------------------------------------------------------------------------
ALTER TABLE public.masoncord_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.masoncord_messages (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS masoncord_messages_reply_idx ON public.masoncord_messages (reply_to_id);

CREATE OR REPLACE FUNCTION public.masoncord_enforce_reply_same_channel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reply_to_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.masoncord_messages r
    WHERE r.id = NEW.reply_to_id
      AND r.channel_id = NEW.channel_id
  ) THEN
    RAISE EXCEPTION 'reply_to_id must reference a message in the same channel';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS masoncord_messages_reply_check ON public.masoncord_messages;
CREATE TRIGGER masoncord_messages_reply_check
  BEFORE INSERT OR UPDATE OF reply_to_id, channel_id ON public.masoncord_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.masoncord_enforce_reply_same_channel();

-- ---------------------------------------------------------------------------
-- List members of a server (bypasses RLS safely — only if you are a member)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.masoncord_list_server_members(p_server_id uuid)
RETURNS TABLE (
  user_id uuid,
  role text,
  nickname text,
  joined_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.user_id, m.role, m.nickname, m.joined_at
  FROM public.masoncord_server_members m
  WHERE m.server_id = p_server_id
    AND EXISTS (
      SELECT 1
      FROM public.masoncord_server_members me
      WHERE me.server_id = p_server_id
        AND me.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.masoncord_list_server_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.masoncord_list_server_members(uuid) TO authenticated;

COMMENT ON FUNCTION public.masoncord_list_server_members(uuid) IS 'Returns members of a server if the caller is a member (for Masoncord UI).';
