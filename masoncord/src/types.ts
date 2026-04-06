export type ServerRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_emoji: string;
};

export type ChannelRow = {
  id: string;
  server_id: string;
  name: string;
  channel_type: string;
  position: number;
  topic: string | null;
};

export type MessageRow = {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  reply_to_id: string | null;
};

export type ProfileLite = {
  user_id: string;
  display_name: string | null;
  email: string | null;
};

export type ServerMemberRow = {
  user_id: string;
  role: string;
  nickname: string | null;
  joined_at: string;
};

export type ReactionRow = {
  message_id: string;
  user_id: string;
  emoji: string;
  channel_id: string;
  created_at: string;
};
