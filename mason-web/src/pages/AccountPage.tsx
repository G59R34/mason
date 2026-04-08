import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const seenMsgKey = 'ms_client_seen_msgs';
const seenMsgTsKey = 'ms_client_seen_ts';

type SessionRow = {
  id: string;
  user_id: string;
  customer_name: string | null;
  contact: string | null;
  details: string | null;
  location: string | null;
  staff_name: string | null;
  scheduled_for: string | null;
  duration_minutes: number | null;
  price: number | null;
  status: string | null;
  admin_message: string | null;
  admin_message_sent_at: string | null;
  session_chat_id: string | null;
  created_at: string;
};

function statusClass(status: string | null): string {
  const s = status || '';
  if (s === 'approved' || s === 'scheduled') return 'account-badge account-badge--ok';
  if (s === 'denied' || s === 'cancelled') return 'account-badge account-badge--bad';
  return 'account-badge account-badge--muted';
}

function defaultDisplayName(email: string | undefined) {
  if (!email) return '';
  const [namePart] = email.split('@');
  return namePart ? namePart.replace(/[._-]+/g, ' ').trim() : '';
}

function normalizeStaffName(value: string | null | undefined) {
  return String(value || '')
    .replace(/[\u00a0\u200b\u200c\u200d\u2060]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const [authPane, setAuthPane] = useState<'login' | 'signup'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [authStatus, setAuthStatus] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [profileStatus, setProfileStatus] = useState('');

  const [staffOptions, setStaffOptions] = useState<string[]>([]);
  const [bookingName, setBookingName] = useState('');
  const [bookingContact, setBookingContact] = useState('');
  const [bookingDetails, setBookingDetails] = useState('');
  const [bookingLocation, setBookingLocation] = useState('');
  const [bookingStaff, setBookingStaff] = useState('');
  const [bookingWhen, setBookingWhen] = useState('');
  const [bookingDuration, setBookingDuration] = useState('');
  const [bookingPrice, setBookingPrice] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsError, setSessionsError] = useState('');

  const [notificationCount, setNotificationCount] = useState(0);
  const [lastConversationIds, setLastConversationIds] = useState<string[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(seenMsgKey) || '[]') as string[];
    } catch {
      return [];
    }
  });
  const [lastSeenTs, setLastSeenTs] = useState(() => Number(localStorage.getItem(seenMsgTsKey) || 0));
  const seenSet = useMemo(() => new Set(seenIds), [seenIds]);

  const loadStaff = useCallback(async () => {
    const { data, error } = await supabase
      .from('staff')
      .select('name, active, sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) return;
    const seen = new Set<string>();
    const names: string[] = [];
    for (const row of data || []) {
      if (row.active === false) continue;
      const clean = normalizeStaffName(row.name as string);
      const key = clean.toLowerCase();
      if (!clean || seen.has(key)) continue;
      seen.add(key);
      names.push(clean);
    }
    setStaffOptions(names);
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();
    if (data) {
      setDisplayName((data as { display_name?: string }).display_name || '');
      return;
    }
    if (error && (error as { code?: string }).code && (error as { code?: string }).code !== 'PGRST116') return;
    const fallback = defaultDisplayName(user.email);
    await supabase.from('user_profiles').upsert([
      { user_id: user.id, display_name: fallback, email: user.email },
    ]);
    setDisplayName(fallback);
  }, [user]);

  const refreshNotificationCount = useCallback(async () => {
    if (!user) {
      setNotificationCount(0);
      return;
    }
    const sessionUnread = sessions.filter((s) => {
      if (!s.admin_message_sent_at) return false;
      const ts = new Date(s.admin_message_sent_at).getTime();
      return !Number.isNaN(ts) && ts > lastSeenTs;
    }).length;
    if (!lastConversationIds.length) {
      setNotificationCount(sessionUnread);
      return;
    }
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('id, conversation_id, sender_role')
      .in('conversation_id', lastConversationIds)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) {
      setNotificationCount(sessionUnread);
      return;
    }
    const unseen = data.filter((msg) => msg.sender_role !== 'user' && !seenSet.has(msg.id as string));
    setNotificationCount(unseen.length + sessionUnread);
  }, [user, sessions, lastConversationIds, lastSeenTs, seenSet]);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    setSessionsError('');
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      setSessionsError('Could not load sessions.');
      setSessions([]);
      return;
    }
    const rows = (data || []) as SessionRow[];
    setSessions(rows);
    const convoIds = Array.from(new Set(rows.map((s) => s.session_chat_id).filter(Boolean))) as string[];
    setLastConversationIds(convoIds);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadProfile();
    void loadSessions();
  }, [user, loadProfile, loadSessions]);

  useEffect(() => {
    void refreshNotificationCount();
  }, [refreshNotificationCount]);

  useEffect(() => {
    if (!user) return;
    const sub = supabase
      .channel('account:conversation_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_messages' },
        (payload) => {
          const msg = payload.new as { conversation_id?: string };
          if (!msg?.conversation_id || !lastConversationIds.includes(msg.conversation_id)) return;
          void refreshNotificationCount();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [user, lastConversationIds, refreshNotificationCount]);

  useEffect(() => {
    if (!user) return;
    const sub = supabase
      .channel('account:sessions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadSessions();
          void refreshNotificationCount();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [user, loadSessions, refreshNotificationCount]);

  async function ensureSessionChat(session: SessionRow): Promise<string | null> {
    if (session.session_chat_id) return session.session_chat_id;
    if (!user) return null;
    const { data, error } = await supabase
      .from('conversations')
      .insert([
        {
          customer_name: session.customer_name || user.email,
          user_id: user.id,
          status: 'open',
        },
      ])
      .select('id')
      .limit(1);
    if (error || !data?.length) return null;
    const convoId = data[0].id as string;
    const { error: updateErr } = await supabase.from('sessions').update({ session_chat_id: convoId }).eq('id', session.id);
    if (updateErr) return null;
    await loadSessions();
    return convoId;
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthStatus('Logging in…');
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword.trim(),
    });
    setAuthStatus(error ? error.message : 'Signed in.');
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword.trim(),
    });
    if (error) {
      setAuthStatus(error.message);
      return;
    }
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: signupEmail.trim(),
      password: signupPassword.trim(),
    });
    setAuthStatus(signInErr ? signInErr.message : 'Signed in.');
  }

  async function onLogout() {
    await supabase.auth.signOut();
    setAuthStatus('Signed out.');
  }

  async function onProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfileStatus('Saving…');
    const { error } = await supabase.from('user_profiles').upsert([
      { user_id: user.id, display_name: displayName.trim(), email: user.email },
    ]);
    setProfileStatus(error ? 'Could not save.' : 'Saved.');
  }

  async function onBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const payload = {
      customer_name: bookingName.trim(),
      contact: bookingContact.trim(),
      details: bookingDetails.trim(),
      location: bookingLocation.trim(),
      staff_name: bookingStaff.trim() || null,
      scheduled_for: bookingWhen.trim() || null,
      duration_minutes: Number(bookingDuration) || null,
      price: Number(bookingPrice) || null,
      status: 'requested',
      user_id: user.id,
    };
    if (!payload.customer_name || !payload.contact) return;
    setBookingStatus('Saving…');
    const { error } = await supabase.from('sessions').insert([payload]);
    setBookingStatus(error ? 'Failed.' : 'Requested.');
    if (!error) {
      setBookingName('');
      setBookingContact('');
      setBookingDetails('');
      setBookingLocation('');
      setBookingStaff('');
      setBookingWhen('');
      setBookingDuration('');
      setBookingPrice('');
      await loadSessions();
    }
  }

  function markAllSeen() {
    const ts = Date.now();
    localStorage.setItem(seenMsgTsKey, String(ts));
    setLastSeenTs(ts);
    if (!lastConversationIds.length) {
      setNotificationCount(0);
      return;
    }
    void supabase
      .from('conversation_messages')
      .select('id')
      .in('conversation_id', lastConversationIds)
      .then(({ data }) => {
        const ids = (data || []).map((row) => (row as { id: string }).id);
        setSeenIds((prev) => {
          const next = [...new Set([...prev, ...ids])].slice(-500);
          localStorage.setItem(seenMsgKey, JSON.stringify(next));
          return next;
        });
        setNotificationCount(0);
      });
  }

  const signedIn = Boolean(user);
  const emailLabel = useMemo(() => user?.email || '', [user?.email]);

  if (authLoading) {
    return (
      <div className="portal-page account-page">
        <div className="portal-page-inner">
          <p className="muted">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page account-page">
      <div className="portal-page-inner">
        <header className="portal-page-head">
          <p className="portal-eyebrow">Client</p>
          <h1>Your account</h1>
          <p className="muted portal-lead">
            Sign in to book sessions and see updates. Support tickets live on{' '}
            <Link to="/tickets">Tickets</Link>.
          </p>
        </header>

        {notificationCount > 0 && (
          <button type="button" className="account-notifications" onClick={markAllSeen}>
            <span className="account-notifications-count">{notificationCount}</span>
            <span>New message(s) from Mason — tap to mark as seen</span>
          </button>
        )}

        {!signedIn && (
          <div className="card account-auth">
            <div className="account-auth-tabs">
              <button
                type="button"
                className={`btn btn-ghost ${authPane === 'login' ? 'is-active' : ''}`}
                onClick={() => setAuthPane('login')}
              >
                Log in
              </button>
              <button
                type="button"
                className={`btn btn-ghost ${authPane === 'signup' ? 'is-active' : ''}`}
                onClick={() => setAuthPane('signup')}
              >
                Sign up
              </button>
            </div>
            {authPane === 'login' ? (
              <form className="form" onSubmit={onLogin}>
                <label>
                  Email
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </label>
                <button type="submit" className="btn">
                  Log in
                </button>
              </form>
            ) : (
              <form className="form" onSubmit={onSignup}>
                <label>
                  Email
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </label>
                <button type="submit" className="btn">
                  Create account
                </button>
              </form>
            )}
            {authStatus && <p className="muted">{authStatus}</p>}
          </div>
        )}

        {signedIn && (
          <>
            <div className="card account-profile">
              <h2>Signed in</h2>
              <p className="muted">
                <strong>{emailLabel}</strong>
              </p>
              <form className="form" onSubmit={onProfileSubmit}>
                <label>
                  Display name
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </label>
                <button type="submit" className="btn">
                  Save profile
                </button>
                {profileStatus && <p className="muted">{profileStatus}</p>}
              </form>
              <button type="button" className="btn btn-ghost" onClick={() => void onLogout()}>
                Log out
              </button>
            </div>

            <div className="card account-booking">
              <h2>Request an appointment</h2>
              <form className="form form-grid-2" onSubmit={onBookingSubmit}>
                <label>
                  Name
                  <input value={bookingName} onChange={(e) => setBookingName(e.target.value)} required />
                </label>
                <label>
                  Contact
                  <input value={bookingContact} onChange={(e) => setBookingContact(e.target.value)} required />
                </label>
                <label className="form-span-2">
                  Details
                  <textarea value={bookingDetails} onChange={(e) => setBookingDetails(e.target.value)} rows={3} />
                </label>
                <label>
                  Location
                  <input value={bookingLocation} onChange={(e) => setBookingLocation(e.target.value)} />
                </label>
                <label>
                  Preferred staff
                  <select value={bookingStaff} onChange={(e) => setBookingStaff(e.target.value)}>
                    <option value="">No preference</option>
                    {staffOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  When (ISO or text)
                  <input value={bookingWhen} onChange={(e) => setBookingWhen(e.target.value)} placeholder="e.g. 2026-05-01 14:00" />
                </label>
                <label>
                  Duration (minutes)
                  <input
                    type="number"
                    min={0}
                    value={bookingDuration}
                    onChange={(e) => setBookingDuration(e.target.value)}
                  />
                </label>
                <label>
                  Price
                  <input type="number" min={0} value={bookingPrice} onChange={(e) => setBookingPrice(e.target.value)} />
                </label>
                <div className="form-span-2">
                  <button type="submit" className="btn">
                    Submit request
                  </button>
                </div>
                {bookingStatus && <p className="muted form-span-2">{bookingStatus}</p>}
              </form>
            </div>

            <div className="card account-sessions">
              <h2>Your sessions</h2>
              {sessionsError && <p className="muted">{sessionsError}</p>}
              {!sessions.length && !sessionsError && <p className="muted">No sessions yet.</p>}
              <ul className="account-session-list">
                {sessions.map((s) => {
                  const when = s.scheduled_for ? new Date(s.scheduled_for).toLocaleString() : 'TBD';
                  const st = s.status || 'requested';
                  return (
                    <li key={s.id} className="account-session">
                      <div className="account-session-head">
                        <strong>{s.customer_name || 'You'}</strong>{' '}
                        <span className={statusClass(s.status)}>{st}</span>
                      </div>
                      <div className="muted">When: {when}</div>
                      <div className="muted">Contact: {s.contact || ''}</div>
                      <div className="muted">Location: {s.location || ''}</div>
                      {s.staff_name && (
                        <div className="muted">
                          <strong>Booked with:</strong> {s.staff_name}
                        </div>
                      )}
                      {s.admin_message && (
                        <div className="muted">
                          <strong>Message from admin:</strong> {s.admin_message}
                        </div>
                      )}
                      {s.details && <div>{s.details}</div>}
                      <div className="account-session-actions">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={async () => {
                            const chatId = await ensureSessionChat(s);
                            if (!chatId) {
                              alert('Unable to open chat yet. Please try again.');
                              return;
                            }
                            window.open(`/sessionchat.html?session=${encodeURIComponent(s.id)}`, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          {s.session_chat_id ? 'Open chat' : 'Start chat'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() =>
                            window.open(
                              `/sessioncall.html?session=${encodeURIComponent(s.id)}&role=client`,
                              '_blank',
                              'noopener,noreferrer'
                            )
                          }
                        >
                          Join call
                        </button>
                        {s.session_chat_id && (
                          <Link to={`/tickets?conversation=${encodeURIComponent(s.session_chat_id)}`} className="btn btn-ghost">
                            Open in tickets
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
