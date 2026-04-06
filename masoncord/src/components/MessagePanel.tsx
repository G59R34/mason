import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useMainSiteUrl } from '../hooks/useMainSiteUrl';
import { avatarStyle } from '../lib/avatarColor';
import { linkifyText } from '../lib/linkify';
import type { ChannelRow, MessageRow, ProfileLite, ReactionRow, ServerMemberRow } from '../types';

type Props = {
  channel: ChannelRow;
  members: ServerMemberRow[];
  memberProfiles: Record<string, ProfileLite>;
};

const GROUP_MS = 5 * 60 * 1000;
const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '💀', '🎵'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(d: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function MessagePanel({ channel, members, memberProfiles }: Props) {
  const mainSiteUrl = useMainSiteUrl();
  const { user } = useAuth();
  const uid = user?.id;
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const mergedProfiles = useMemo(() => ({ ...memberProfiles, ...profiles }), [memberProfiles, profiles]);

  const byId = useMemo(() => {
    const m = new Map<string, MessageRow>();
    messages.forEach((msg) => m.set(msg.id, msg));
    return m;
  }, [messages]);

  const reactionGroups = useMemo(() => {
    const map = new Map<string, Map<string, { count: number; me: boolean }>>();
    for (const r of reactions) {
      if (!map.has(r.message_id)) map.set(r.message_id, new Map());
      const em = map.get(r.message_id)!;
      const cur = em.get(r.emoji) ?? { count: 0, me: false };
      cur.count += 1;
      if (r.user_id === uid) cur.me = true;
      em.set(r.emoji, cur);
    }
    return map;
  }, [reactions, uid]);

  const loadProfiles = useCallback(async (userIds: string[]) => {
    const uniq = [...new Set(userIds)].filter(Boolean);
    if (!uniq.length) return;
    const { data, error } = await supabase.from('user_profiles').select('user_id, display_name, email').in('user_id', uniq);
    if (error) return;
    const map: Record<string, ProfileLite> = {};
    (data || []).forEach((row: ProfileLite) => {
      map[row.user_id] = row;
    });
    setProfiles((prev) => ({ ...prev, ...map }));
  }, []);

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('masoncord_messages')
      .select('id,channel_id,user_id,content,created_at,edited_at,reply_to_id')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: true })
      .limit(300);

    if (error) {
      console.warn('messages', error);
      return;
    }
    const rows = (data || []) as MessageRow[];
    setMessages(rows);
    const profileIds = new Set<string>();
    rows.forEach((m) => {
      profileIds.add(m.user_id);
      if (m.reply_to_id) {
        const parent = rows.find((x) => x.id === m.reply_to_id);
        if (parent) profileIds.add(parent.user_id);
      }
    });
    await loadProfiles([...profileIds]);
  }, [channel.id, loadProfiles]);

  const loadReactions = useCallback(async (messageIds: string[]) => {
    if (!messageIds.length) {
      setReactions([]);
      return;
    }
    const { data, error } = await supabase
      .from('masoncord_message_reactions')
      .select('message_id,user_id,emoji,channel_id,created_at')
      .in('message_id', messageIds);
    if (error) {
      if (!error.message?.includes('does not exist') && !error.message?.includes('schema cache')) {
        console.warn('reactions', error);
      }
      setReactions([]);
      return;
    }
    setReactions((data || []) as ReactionRow[]);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const ids = messages.map((m) => m.id);
    void loadReactions(ids);
  }, [messages, loadReactions]);

  useEffect(() => {
    const ch = supabase
      .channel(`masoncord:${channel.id}:all`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'masoncord_messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as MessageRow;
            setMessages((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]));
            await loadProfiles([row.user_id]);
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as MessageRow;
            setMessages((prev) => prev.map((x) => (x.id === row.id ? row : x)));
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as { id?: string };
            if (old?.id) {
              setMessages((prev) => prev.filter((x) => x.id !== old.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [channel.id, loadProfiles]);

  useEffect(() => {
    const ch = supabase
      .channel(`masoncord:${channel.id}:rx`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'masoncord_message_reactions',
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as ReactionRow;
            setReactions((prev) => (prev.some((x) => x.message_id === row.message_id && x.user_id === row.user_id && x.emoji === row.emoji) ? prev : [...prev, row]));
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as Partial<ReactionRow>;
            if (old.message_id && old.user_id && old.emoji) {
              setReactions((prev) =>
                prev.filter((x) => !(x.message_id === old.message_id && x.user_id === old.user_id && x.emoji === old.emoji))
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [channel.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, channel.id]);

  function displayName(userId: string) {
    const mem = members.find((m) => m.user_id === userId);
    const nick = mem?.nickname?.trim();
    if (nick) return nick;
    const p = mergedProfiles[userId];
    if (p?.display_name?.trim()) return p.display_name;
    if (p?.email) return p.email.split('@')[0];
    return userId.slice(0, 8);
  }

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => {
      if (m.content.toLowerCase().includes(q)) return true;
      const mem = members.find((x) => x.user_id === m.user_id);
      const nick = mem?.nickname?.trim();
      const p = mergedProfiles[m.user_id];
      const name =
        nick ||
        (p?.display_name?.trim() ? p.display_name : null) ||
        (p?.email ? p.email.split('@')[0] : null) ||
        m.user_id.slice(0, 8);
      return name.toLowerCase().includes(q);
    });
  }, [messages, searchQuery, members, mergedProfiles]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSending(true);
    const { data: inserted, error } = await supabase
      .from('masoncord_messages')
      .insert({
        channel_id: channel.id,
        user_id: u.user.id,
        content: trimmed,
        ...(replyTo ? { reply_to_id: replyTo.id } : {}),
      })
      .select('id,channel_id,user_id,content,created_at,edited_at,reply_to_id')
      .single();
    setSending(false);
    if (error) {
      alert(error.message);
      return;
    }
    if (inserted) {
      const row = inserted as MessageRow;
      setMessages((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]));
      await loadProfiles([row.user_id]);
    }
    setText('');
    setReplyTo(null);
  }

  function onComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(e as unknown as FormEvent);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const trimmed = editing.text.trim();
    if (!trimmed) return;
    const { data: updated, error } = await supabase
      .from('masoncord_messages')
      .update({ content: trimmed, edited_at: new Date().toISOString() })
      .eq('id', editing.id)
      .select('id,channel_id,user_id,content,created_at,edited_at,reply_to_id')
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    if (updated) {
      const row = updated as MessageRow;
      setMessages((prev) => prev.map((x) => (x.id === row.id ? row : x)));
    }
    setEditing(null);
  }

  async function deleteMessage(id: string) {
    if (!window.confirm('Delete this message?')) return;
    const { error } = await supabase.from('masoncord_messages').delete().eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    setMessages((prev) => prev.filter((x) => x.id !== id));
    setReactions((prev) => prev.filter((r) => r.message_id !== id));
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!uid) return;
    const exists = reactions.some((r) => r.message_id === messageId && r.user_id === uid && r.emoji === emoji);
    if (exists) {
      const { error } = await supabase
        .from('masoncord_message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', uid)
        .eq('emoji', emoji);
      if (error) {
        if (!error.message?.includes('does not exist')) alert(error.message);
        return;
      }
      setReactions((prev) => prev.filter((r) => !(r.message_id === messageId && r.user_id === uid && r.emoji === emoji)));
    } else {
      const { data: inserted, error } = await supabase
        .from('masoncord_message_reactions')
        .insert({ message_id: messageId, user_id: uid, emoji })
        .select('message_id,user_id,emoji,channel_id,created_at')
        .single();
      if (error) {
        if (!error.message?.includes('does not exist')) alert(error.message);
        return;
      }
      if (inserted) {
        const row = inserted as ReactionRow;
        setReactions((prev) => [...prev, row]);
      }
    }
  }

  async function copyMessage(content: string) {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      /* ignore */
    }
  }

  function scrollToMessage(id: string) {
    document.getElementById(`mc-msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function showAvatarAt(index: number, list: MessageRow[]) {
    if (index === 0) return true;
    const prev = list[index - 1];
    const cur = list[index];
    if (!prev || !cur) return true;
    if (prev.user_id !== cur.user_id) return true;
    const t0 = new Date(prev.created_at).getTime();
    const t1 = new Date(cur.created_at).getTime();
    return t1 - t0 > GROUP_MS;
  }

  function showDayDividerAt(index: number, list: MessageRow[]) {
    if (index === 0) return true;
    const prev = new Date(list[index - 1].created_at);
    const cur = new Date(list[index].created_at);
    return !sameDay(prev, cur);
  }

  const list = filteredMessages;

  return (
    <div className="mc-panel">
      <header className="mc-panel-head">
        <div className="mc-panel-head-text">
          <div className="mc-channel-title-row">
            <span className="mc-channel-hash" aria-hidden>
              #
            </span>
            <h1>{channel.name}</h1>
          </div>
          {channel.topic && <p className="mc-panel-topic">{channel.topic}</p>}
        </div>
        <div className="mc-panel-tools">
          <label className="mc-search">
            <input
              type="search"
              className="mc-search-input"
              placeholder="Search messages…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              aria-label="Search messages"
            />
          </label>
          <a className="mc-panel-site" href={mainSiteUrl} target="_blank" rel="noreferrer">
            Main site
          </a>
        </div>
      </header>

      <div className="mc-messages">
        {list.length === 0 && messages.length > 0 && (
          <div className="mc-messages-empty">No messages match your search.</div>
        )}
        {messages.length === 0 && <div className="mc-messages-empty">No messages yet. Say something unhinged.</div>}
        {list.map((m, i) => (
          <div key={m.id}>
            {showDayDividerAt(i, list) && (
              <div className="mc-day-divider" role="separator">
                <span>{dayLabel(new Date(m.created_at))}</span>
              </div>
            )}
            <article
              id={`mc-msg-${m.id}`}
              className={`mc-msg ${showAvatarAt(i, list) ? 'mc-msg--start' : 'mc-msg--compact'} ${m.user_id === uid ? 'mc-msg--mine' : ''}`}
            >
              {showAvatarAt(i, list) && (
                <div className="mc-msg-avatar" style={avatarStyle(m.user_id)} aria-hidden>
                  {displayName(m.user_id).slice(0, 1).toUpperCase()}
                </div>
              )}
              {!showAvatarAt(i, list) && <div className="mc-msg-avatar-spacer" aria-hidden />}
              <div className="mc-msg-body">
                {showAvatarAt(i, list) && (
                  <header className="mc-msg-meta">
                    <strong>{displayName(m.user_id)}</strong>
                    <time dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
                    {m.edited_at && <span className="mc-msg-edited">(edited)</span>}
                  </header>
                )}
                {m.reply_to_id && (() => {
                  const parent = byId.get(m.reply_to_id);
                  return (
                    <button
                      type="button"
                      className="mc-msg-reply-ref mc-msg-reply-ref--btn"
                      onClick={() => scrollToMessage(m.reply_to_id!)}
                    >
                      Replying to{' '}
                      <strong>{parent ? displayName(parent.user_id) : 'earlier message'}</strong>
                      {parent && (
                        <span className="mc-msg-reply-snippet">
                          {' '}
                          {parent.content.slice(0, 80)}
                          {parent.content.length > 80 ? '…' : ''}
                        </span>
                      )}
                    </button>
                  );
                })()}
                {editing?.id === m.id ? (
                  <div className="mc-msg-edit-box">
                    <textarea
                      value={editing.text}
                      onChange={(e) => setEditing({ id: m.id, text: e.target.value })}
                      rows={3}
                      className="mc-input"
                    />
                    <div className="mc-msg-edit-actions">
                      <button type="button" className="mc-btn-tiny" onClick={saveEdit}>
                        Save
                      </button>
                      <button type="button" className="mc-btn-tiny mc-btn-tiny--ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mc-msg-text">{linkifyText(m.content)}</p>
                )}
                {editing?.id !== m.id && (
                  <div className="mc-msg-actions">
                    <button type="button" className="mc-msg-action" onClick={() => setReplyTo(m)} title="Reply">
                      Reply
                    </button>
                    <button type="button" className="mc-msg-action" onClick={() => copyMessage(m.content)} title="Copy text">
                      Copy
                    </button>
                    {m.user_id === uid && (
                      <>
                        <button type="button" className="mc-msg-action" onClick={() => setEditing({ id: m.id, text: m.content })} title="Edit">
                          Edit
                        </button>
                        <button type="button" className="mc-msg-action mc-msg-action--danger" onClick={() => deleteMessage(m.id)} title="Delete">
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
                {editing?.id !== m.id && (
                  <div className="mc-msg-reactions">
                    {Array.from(reactionGroups.get(m.id)?.entries() ?? []).map(([emoji, info]) => (
                      <button
                        key={emoji}
                        type="button"
                        className={`mc-react-pill ${info.me ? 'mc-react-pill--me' : ''}`}
                        onClick={() => toggleReaction(m.id, emoji)}
                      >
                        <span>{emoji}</span>
                        <span className="mc-react-count">{info.count}</span>
                      </button>
                    ))}
                    <div className="mc-react-quick-row" aria-label="Add reaction">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="mc-react-quick"
                          title={`React with ${emoji}`}
                          onClick={() => toggleReaction(m.id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mc-composer-wrap">
        {replyTo && (
          <div className="mc-reply-banner">
            <div>
              <span className="mc-reply-banner-label">Replying to {displayName(replyTo.user_id)}</span>
              <p className="mc-reply-banner-snippet">
                {replyTo.content.slice(0, 120)}
                {replyTo.content.length > 120 ? '…' : ''}
              </p>
            </div>
            <button type="button" className="mc-reply-banner-close" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
              ×
            </button>
          </div>
        )}
        <form className="mc-composer" onSubmit={send}>
          <textarea
            className="mc-composer-input"
            placeholder={`Message #${channel.name}`}
            value={text}
            maxLength={4000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onComposerKeyDown}
            rows={1}
            autoComplete="off"
          />
          <div className="mc-composer-footer">
            <span className="mc-composer-hint">Enter to send · Shift+Enter newline</span>
            <span className="mc-composer-count">{text.length}/4000</span>
            <button type="submit" className="mc-btn mc-btn-send" disabled={sending || !text.trim()}>
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
