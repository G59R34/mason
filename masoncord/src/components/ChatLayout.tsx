import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useMainSiteUrl } from '../hooks/useMainSiteUrl';
import { MembersPanel } from './MembersPanel';
import { MessagePanel } from './MessagePanel';
import type { ChannelRow, ProfileLite, ServerMemberRow, ServerRow } from '../types';

const READ_LS = 'masoncord_channel_read_v1';

export function ChatLayout() {
  const mainSiteUrl = useMainSiteUrl();
  const { user } = useAuth();
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState<ServerRow | null>(null);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [members, setMembers] = useState<ServerMemberRow[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, ProfileLite>>({});
  const [channelActivity, setChannelActivity] = useState<Record<string, string>>({});
  const [readBump, setReadBump] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [nickOpen, setNickOpen] = useState(false);
  const [nickDraft, setNickDraft] = useState('');

  const myMembership = members.find((m) => m.user_id === user?.id);

  useEffect(() => {
    setNickDraft(myMembership?.nickname ?? '');
  }, [myMembership?.nickname]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadError(null);
      const { error: rpcErr } = await supabase.rpc('masoncord_ensure_main_membership');
      if (rpcErr) {
        console.warn('masoncord_ensure_main_membership', rpcErr);
        if (rpcErr.message?.includes('function') && rpcErr.message?.includes('does not exist')) {
          if (!cancelled) {
            setLoadError('Run masoncord_setup.sql in Supabase (function masoncord_ensure_main_membership).');
            setReady(true);
          }
          return;
        }
      }

      const { data: srv, error: sErr } = await supabase
        .from('masoncord_servers')
        .select('id,slug,name,description,icon_emoji')
        .eq('slug', 'main')
        .maybeSingle();

      if (cancelled) return;

      if (sErr || !srv) {
        setLoadError(sErr?.message || 'Main server not found. Run masoncord_setup.sql.');
        setReady(true);
        return;
      }

      setServer(srv as ServerRow);

      const { data: ch, error: cErr } = await supabase
        .from('masoncord_channels')
        .select('id,server_id,name,channel_type,position,topic')
        .eq('server_id', srv.id)
        .order('position', { ascending: true });

      if (cancelled) return;

      if (cErr) {
        setLoadError(cErr.message);
        setReady(true);
        return;
      }

      setChannels((ch || []) as ChannelRow[]);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!server?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('masoncord_list_server_members', { p_server_id: server.id });
      if (cancelled) return;
      if (error) {
        console.warn('masoncord_list_server_members', error);
        setMembers([]);
        return;
      }
      const rows = (data || []) as ServerMemberRow[];
      setMembers(rows);
      const ids = rows.map((r) => r.user_id);
      if (!ids.length) return;
      const { data: profs } = await supabase.from('user_profiles').select('user_id, display_name, email').in('user_id', ids);
      if (cancelled) return;
      const map: Record<string, ProfileLite> = {};
      (profs || []).forEach((p: ProfileLite) => {
        map[p.user_id] = p;
      });
      setMemberProfiles(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [server?.id]);

  useEffect(() => {
    if (!server?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('masoncord_channel_last_activity', { p_server_id: server.id });
      if (cancelled) return;
      if (error) {
        console.warn('masoncord_channel_last_activity', error);
        return;
      }
      const map: Record<string, string> = {};
      (data || []).forEach((row: { channel_id: string; last_at: string | null }) => {
        if (row.last_at) map[row.channel_id] = row.last_at;
      });
      setChannelActivity(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [server?.id]);

  useEffect(() => {
    if (!channelId) return;
    try {
      const raw = localStorage.getItem(READ_LS);
      const o = raw ? JSON.parse(raw) : {};
      o[channelId] = new Date().toISOString();
      localStorage.setItem(READ_LS, JSON.stringify(o));
      setReadBump((n) => n + 1);
    } catch {
      /* ignore */
    }
  }, [channelId]);

  useEffect(() => {
    if (!ready || !channels.length) return;
    if (!channelId) {
      navigate(`/channel/${channels[0].id}`, { replace: true });
    }
  }, [ready, channels, channelId, navigate]);

  useEffect(() => {
    if (!ready || !channels.length || !channelId) return;
    const exists = channels.some((c) => c.id === channelId);
    if (!exists) {
      navigate(`/channel/${channels[0].id}`, { replace: true });
    }
  }, [ready, channels, channelId, navigate]);

  function channelUnread(chId: string): boolean {
    if (chId === channelId) return false;
    void readBump;
    const last = channelActivity[chId];
    if (!last) return false;
    let readAt = '1970-01-01T00:00:00.000Z';
    try {
      const raw = localStorage.getItem(READ_LS);
      const o = raw ? JSON.parse(raw) : {};
      if (o[chId]) readAt = o[chId];
    } catch {
      /* ignore */
    }
    return new Date(last).getTime() > new Date(readAt).getTime();
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function saveNickname() {
    if (!server || !user) return;
    const v = nickDraft.trim();
    const { error } = await supabase
      .from('masoncord_server_members')
      .update({ nickname: v || null })
      .eq('server_id', server.id)
      .eq('user_id', user.id);
    if (error) {
      alert(error.message);
      return;
    }
    setMembers((prev) => prev.map((m) => (m.user_id === user.id ? { ...m, nickname: v || null } : m)));
    setNickOpen(false);
  }

  if (!ready) {
    return (
      <div className="mc-loading">
        <div className="mc-loading-inner">
          <div className="mc-spinner" />
          <p>Connecting to the Mason hive…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mc-error-screen">
        <h1>Masoncord</h1>
        <p className="mc-error-text">{loadError}</p>
        <a href={mainSiteUrl} className="mc-btn mc-btn-primary">
          Main site
        </a>
      </div>
    );
  }

  const activeChannel = channels.find((c) => c.id === channelId) ?? channels[0];

  return (
    <div className="mc-shell">
      <header className="mc-topbar">
        <div className="mc-topbar-brand">
          <span className="mc-topbar-mark" aria-hidden>
            💜
          </span>
          <span className="mc-topbar-name">Masoncord</span>
        </div>
        <a className="mc-topbar-link" href={mainSiteUrl}>
          Main website
        </a>
       
      </header>
      <div className="mc-body">
        <aside className="mc-rail" aria-label="Server">
          <div className="mc-rail-icon" title={server?.name ?? 'Masoncord'}>
            {server?.icon_emoji ?? '💜'}
          </div>
        </aside>
        <aside className="mc-channels">
          <div className="mc-channels-head">
            <h2>{server?.name ?? 'Masoncord'}</h2>
            <p className="mc-channels-sub">{server?.description}</p>
          </div>
          <div className="mc-channels-label">Channels</div>
          <nav className="mc-channel-list">
            {channels.map((ch) => (
              <NavLink
                key={ch.id}
                to={`/channel/${ch.id}`}
                className={({ isActive }) => `mc-channel-link ${isActive ? 'active' : ''}`}
              >
                <span className="mc-channel-hash">#</span>
                <span className="mc-channel-name">{ch.name}</span>
                {channelUnread(ch.id) && <span className="mc-channel-unread" aria-label="Unread messages" />}
              </NavLink>
            ))}
          </nav>
          <div className="mc-user-bar">
            {!nickOpen ? (
              <>
                <div className="mc-user-meta">
                  <span className="mc-user-dot" aria-hidden />
                  <span className="mc-user-email" title={user?.email ?? ''}>
                    {myMembership?.nickname?.trim() || user?.email?.split('@')[0] || 'You'}
                  </span>
                </div>
                <div className="mc-user-actions">
                  <button type="button" className="mc-btn-ghost mc-btn-ghost--tiny" onClick={() => setNickOpen(true)}>
                    Nickname
                  </button>
                  <button type="button" className="mc-btn-ghost" onClick={signOut}>
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <div className="mc-nick-edit">
                <input
                  className="mc-nick-input"
                  value={nickDraft}
                  onChange={(e) => setNickDraft(e.target.value)}
                  placeholder="Server nickname"
                  maxLength={64}
                  autoFocus
                />
                <div className="mc-nick-actions">
                  <button type="button" className="mc-btn-tiny" onClick={saveNickname}>
                    Save
                  </button>
                  <button
                    type="button"
                    className="mc-btn-tiny mc-btn-tiny--ghost"
                    onClick={() => {
                      setNickOpen(false);
                      setNickDraft(myMembership?.nickname ?? '');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
        <main className="mc-main">
          {activeChannel && channelId ? (
            <MessagePanel key={activeChannel.id} channel={activeChannel} members={members} memberProfiles={memberProfiles} />
          ) : (
            <div className="mc-empty-main">Pick a channel.</div>
          )}
        </main>
        {server && <MembersPanel members={members} profiles={memberProfiles} />}
      </div>
    </div>
  );
}
