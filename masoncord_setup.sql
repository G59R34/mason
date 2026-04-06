-- Masoncord — Discord-style chat for the Mason ecosystem
-- Run in Supabase SQL editor after core auth is enabled.
-- Uses the same auth.users as mason-web / masonadmin (shared sessions via storage key mason_auth in apps).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Servers ("guilds")
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.masoncord_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon_emoji text NOT NULL DEFAULT '💜',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS masoncord_servers_slug_idx ON public.masoncord_servers (slug);

-- ---------------------------------------------------------------------------
-- Membership (who can see which server)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.masoncord_server_members (
  server_id uuid NOT NULL REFERENCES public.masoncord_servers (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'mod', 'admin')),
  nickname text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (server_id, user_id)
);

CREATE INDEX IF NOT EXISTS masoncord_members_user_idx ON public.masoncord_server_members (user_id);

-- ---------------------------------------------------------------------------
-- Channels
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.masoncord_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.masoncord_servers (id) ON DELETE CASCADE,
  name text NOT NULL,
  channel_type text NOT NULL DEFAULT 'text' CHECK (channel_type IN ('text', 'voice')),
  position integer NOT NULL DEFAULT 0,
  topic text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (server_id, name)
);

CREATE INDEX IF NOT EXISTS masoncord_channels_server_idx ON public.masoncord_channels (server_id, position);

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.masoncord_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.masoncord_channels (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reply_to_id uuid REFERENCES public.masoncord_messages (id) ON DELETE SET NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

CREATE INDEX IF NOT EXISTS masoncord_messages_channel_idx ON public.masoncord_messages (channel_id, created_at);
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
    SELECT 1 FROM public.masoncord_messages r
    WHERE r.id = NEW.reply_to_id AND r.channel_id = NEW.channel_id
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
      SELECT 1 FROM public.masoncord_server_members me
      WHERE me.server_id = p_server_id AND me.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.masoncord_list_server_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.masoncord_list_server_members(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Reactions (v3)
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

-- ---------------------------------------------------------------------------
-- Seed: default Mason hub (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO public.masoncord_servers (slug, name, description, icon_emoji)
VALUES (
  'main',
  'Sex With Mason',
  'The official Masoncord — sessions, vibes, and chaos.',
  '💜'
)
ON CONFLICT (slug) DO NOTHING;

-- Channels for main server
INSERT INTO public.masoncord_channels (server_id, name, channel_type, position, topic)
SELECT s.id, v.name, 'text', v.pos, v.topic
FROM public.masoncord_servers s
CROSS JOIN (
  VALUES
    ('welcome', 0, 'Rules, intros, and how to not get banned.'),
    ('general', 1, 'Main hangout. Keep it consensual.'),
    ('sessions', 2, 'Booking, schedules, session chat.'),
    ('nut-for-me', 3, 'Music, tracks, Pegger Productions.'),
    ('shitposting', 4, 'Low effort. High energy.')
) AS v(name, pos, topic)
WHERE s.slug = 'main'
ON CONFLICT (server_id, name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.masoncord_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masoncord_server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masoncord_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masoncord_messages ENABLE ROW LEVEL SECURITY;

-- Servers: visible if you are a member
DROP POLICY IF EXISTS masoncord_servers_select_member ON public.masoncord_servers;
CREATE POLICY masoncord_servers_select_member ON public.masoncord_servers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.masoncord_server_members m
      WHERE m.server_id = masoncord_servers.id AND m.user_id = auth.uid()
    )
  );

-- Members: each user may only read their own membership rows.
-- (Do not SELECT from this table inside this policy — that causes infinite RLS recursion.)
DROP POLICY IF EXISTS masoncord_members_select ON public.masoncord_server_members;
CREATE POLICY masoncord_members_select ON public.masoncord_server_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS masoncord_members_insert_self ON public.masoncord_server_members;
CREATE POLICY masoncord_members_insert_self ON public.masoncord_server_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS masoncord_members_update_self ON public.masoncord_server_members;
CREATE POLICY masoncord_members_update_self ON public.masoncord_server_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Channels: read if member of parent server
DROP POLICY IF EXISTS masoncord_channels_select_member ON public.masoncord_channels;
CREATE POLICY masoncord_channels_select_member ON public.masoncord_channels
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.masoncord_server_members m
      WHERE m.server_id = masoncord_channels.server_id AND m.user_id = auth.uid()
    )
  );

-- Messages: read if member of server that owns the channel
DROP POLICY IF EXISTS masoncord_messages_select_member ON public.masoncord_messages;
CREATE POLICY masoncord_messages_select_member ON public.masoncord_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.masoncord_channels ch
      JOIN public.masoncord_server_members m ON m.server_id = ch.server_id
      WHERE ch.id = masoncord_messages.channel_id AND m.user_id = auth.uid()
    )
  );

-- Messages: insert only as yourself, and only in channels you can access
DROP POLICY IF EXISTS masoncord_messages_insert_self ON public.masoncord_messages;
CREATE POLICY masoncord_messages_insert_self ON public.masoncord_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.masoncord_channels ch
      JOIN public.masoncord_server_members m ON m.server_id = ch.server_id
      WHERE ch.id = masoncord_messages.channel_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS masoncord_messages_update_own ON public.masoncord_messages;
CREATE POLICY masoncord_messages_update_own ON public.masoncord_messages
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS masoncord_messages_delete_own ON public.masoncord_messages;
CREATE POLICY masoncord_messages_delete_own ON public.masoncord_messages
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Auto-join main server for new members (optional helper)
-- Call from the app once after login: SELECT public.masoncord_ensure_main_membership();
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.masoncord_ensure_main_membership()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  SELECT id INTO sid FROM public.masoncord_servers WHERE slug = 'main' LIMIT 1;
  IF sid IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.masoncord_server_members (server_id, user_id, role)
  VALUES (sid, auth.uid(), 'member')
  ON CONFLICT (server_id, user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.masoncord_ensure_main_membership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.masoncord_ensure_main_membership() TO authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: enable replication for messages (run if not auto-enabled)
-- Dashboard → Database → Replication, or:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.masoncord_messages;
-- ---------------------------------------------------------------------------

COMMENT ON TABLE public.masoncord_servers IS 'Masoncord guilds; main site links here via same Supabase auth.';
COMMENT ON TABLE public.masoncord_messages IS 'Chat messages; subscribe with supabase.channel on INSERT.';
