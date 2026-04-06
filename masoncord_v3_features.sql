-- Masoncord v3: message reactions, channel activity RPC (unread), reaction realtime filter
-- Run in Supabase SQL editor after v2 / masoncord_setup. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Reactions (channel_id denormalized for RLS + Realtime filter)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.masoncord_message_reactions (
  message_id uuid NOT NULL REFERENCES public.masoncord_messages (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 32),
  channel_id uuid NOT NULL REFERENCES public.masoncord_channels (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS masoncord_reactions_channel_idx ON public.masoncord_message_reactions (channel_id);
CREATE INDEX IF NOT EXISTS masoncord_reactions_message_idx ON public.masoncord_message_reactions (message_id);

CREATE OR REPLACE FUNCTION public.masoncord_reaction_fill_channel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SELECT m.channel_id INTO NEW.channel_id
  FROM public.masoncord_messages m
  WHERE m.id = NEW.message_id;
  IF NEW.channel_id IS NULL THEN
    RAISE EXCEPTION 'message not found';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS masoncord_reactions_fill_channel ON public.masoncord_message_reactions;
CREATE TRIGGER masoncord_reactions_fill_channel
  BEFORE INSERT ON public.masoncord_message_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.masoncord_reaction_fill_channel();

ALTER TABLE public.masoncord_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS masoncord_reactions_select_member ON public.masoncord_message_reactions;
CREATE POLICY masoncord_reactions_select_member ON public.masoncord_message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.masoncord_channels ch
      JOIN public.masoncord_server_members m ON m.server_id = ch.server_id
      WHERE ch.id = masoncord_message_reactions.channel_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS masoncord_reactions_insert_self ON public.masoncord_message_reactions;
CREATE POLICY masoncord_reactions_insert_self ON public.masoncord_message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.masoncord_messages msg
      JOIN public.masoncord_channels ch ON ch.id = msg.channel_id
      JOIN public.masoncord_server_members m ON m.server_id = ch.server_id
      WHERE msg.id = masoncord_message_reactions.message_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS masoncord_reactions_delete_own ON public.masoncord_message_reactions;
CREATE POLICY masoncord_reactions_delete_own ON public.masoncord_message_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Latest message time per channel (for unread badges)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.masoncord_channel_last_activity(p_server_id uuid)
RETURNS TABLE (
  channel_id uuid,
  last_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ch.id, lm.last_at
  FROM public.masoncord_channels ch
  LEFT JOIN LATERAL (
    SELECT MAX(m.created_at) AS last_at
    FROM public.masoncord_messages m
    WHERE m.channel_id = ch.id
  ) lm ON true
  WHERE ch.server_id = p_server_id
    AND EXISTS (
      SELECT 1 FROM public.masoncord_server_members mem
      WHERE mem.server_id = p_server_id AND mem.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.masoncord_channel_last_activity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.masoncord_channel_last_activity(uuid) TO authenticated;

COMMENT ON FUNCTION public.masoncord_channel_last_activity(uuid) IS 'Per-channel latest message time for Masoncord unread indicators.';
COMMENT ON TABLE public.masoncord_message_reactions IS 'Emoji reactions; channel_id filled by trigger for Realtime filter.';

-- Realtime (optional): ALTER PUBLICATION supabase_realtime ADD TABLE public.masoncord_message_reactions;
