import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase.js';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'conversations', label: 'Conversations' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'sessions', label: 'Sessions' }
];

const emptyCounts = {
  Reviews: 0,
  Conversations: 0,
  Messages: 0,
  Sessions: 0,
  Announcements: 0
};

function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export default function App() {
  const { session, loading: authLoading } = useAuth();
  const [adminState, setAdminState] = useState({ status: 'idle', error: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [counts, setCounts] = useState(emptyCounts);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementStatic, setAnnouncementStatic] = useState(false);
  const [announcementLabel, setAnnouncementLabel] = useState('NOTICE');
  const [announcementColor, setAnnouncementColor] = useState('#0f766e');
  const [announcementStatus, setAnnouncementStatus] = useState('');
  const [conversations, setConversations] = useState([]);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [currentConversationMeta, setCurrentConversationMeta] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [reviews, setReviews] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [hasConversationSubject, setHasConversationSubject] = useState(false);
  const [hasConversationClosedAt, setHasConversationClosedAt] = useState(false);
  const [hasConversationLastMessageAt, setHasConversationLastMessageAt] = useState(false);
  const [hasAnnouncementStatic, setHasAnnouncementStatic] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    customer_name: '',
    contact: '',
    details: '',
    scheduled_for: ''
  });
  const [ticketForm, setTicketForm] = useState({
    customer_name: '',
    subject: ''
  });

  const isReady = useMemo(
    () => session && adminState.status === 'allowed',
    [session, adminState.status]
  );

  useEffect(() => {
    if (!session) {
      setAdminState({ status: 'idle', error: '' });
      return;
    }
    let mounted = true;
    setAdminState({ status: 'checking', error: '' });
    supabase
      .rpc('is_admin')
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setAdminState({ status: 'denied', error: error.message });
        } else if (data) {
          setAdminState({ status: 'allowed', error: '' });
        } else {
          setAdminState({ status: 'denied', error: '' });
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setAdminState({ status: 'denied', error: err.message });
      });
    return () => {
      mounted = false;
    };
  }, [session]);

  useEffect(() => {
    if (!isReady) return;
    loadDashboard();
    loadAnnouncements();
    loadConversations();
    loadReviews();
    loadSessions();
    detectConversationColumns();
    detectAnnouncementColumns();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    const convoChannel = supabase
      .channel('admin:conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          loadConversations();
          loadDashboard();
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('conversations realtime status', status);
        }
      });

    const messageChannel = supabase
      .channel('admin:conversation_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_messages' },
        (payload) => {
          loadDashboard();
          if (payload.new?.conversation_id && payload.new.conversation_id === currentConversation) {
            loadConversationMessages(currentConversation);
          } else {
            loadConversations();
          }
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('messages realtime status', status);
        }
      });

    const announcementsChannel = supabase
      .channel('admin:announcements')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          loadAnnouncements();
          loadDashboard();
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('announcements realtime status', status);
        }
      });

    const reviewsChannel = supabase
      .channel('admin:reviews')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        () => {
          loadReviews();
          loadDashboard();
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('reviews realtime status', status);
        }
      });

    const pollId = window.setInterval(() => {
      loadConversations();
      loadDashboard();
      if (currentConversation) {
        loadConversationMessages(currentConversation);
      }
    }, 8000);

    return () => {
      supabase.removeChannel(convoChannel);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(announcementsChannel);
      supabase.removeChannel(reviewsChannel);
      window.clearInterval(pollId);
    };
  }, [isReady, currentConversation]);

  async function detectConversationColumns() {
    try {
      const subjectProbe = await supabase.from('conversations').select('subject').limit(1);
      setHasConversationSubject(!subjectProbe.error);
    } catch (e) {
      setHasConversationSubject(false);
    }
    try {
      const closedProbe = await supabase.from('conversations').select('closed_at').limit(1);
      setHasConversationClosedAt(!closedProbe.error);
    } catch (e) {
      setHasConversationClosedAt(false);
    }
    try {
      const lastProbe = await supabase.from('conversations').select('last_message_at').limit(1);
      setHasConversationLastMessageAt(!lastProbe.error);
    } catch (e) {
      setHasConversationLastMessageAt(false);
    }
  }

  async function detectAnnouncementColumns() {
    try {
      const probe = await supabase.from('announcements').select('is_static').limit(1);
      setHasAnnouncementStatic(!probe.error);
    } catch (e) {
      setHasAnnouncementStatic(false);
    }
  }

  useEffect(() => {
    if (!currentConversation) return;
    const meta = conversations.find((item) => item.id === currentConversation) || null;
    setCurrentConversationMeta(meta);
  }, [conversations, currentConversation]);

  async function loadDashboard() {
    const tables = [
      ['reviews', 'Reviews'],
      ['conversations', 'Conversations'],
      ['conversation_messages', 'Messages'],
      ['sessions', 'Sessions'],
      ['announcements', 'Announcements']
    ];
    const nextCounts = { ...emptyCounts };
    for (const [table, label] of tables) {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      nextCounts[label] = count || 0;
    }
    setCounts(nextCounts);
  }

  async function loadAnnouncements() {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setAnnouncements(data || []);
  }

  async function loadConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setConversations(data || []);
  }

  async function loadConversationMessages(conversationId) {
    const { data } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setConversationMessages(data || []);
  }

  async function loadReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setReviews(data || []);
  }

  async function loadSessions() {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .order('scheduled_for', { ascending: true })
      .limit(100);
    setSessions(data || []);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = (form.get('email') || '').toString().trim();
    const password = (form.get('password') || '').toString();
    if (!email || !password) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAdminState({ status: 'denied', error: error.message });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setActiveTab('dashboard');
  }

  async function submitAnnouncement(event) {
    event.preventDefault();
    if (!announcementText.trim()) return;
    setAnnouncementStatus('Publishing...');
    const payload = { message: announcementText.trim() };
    if (announcementStatic) {
      if (!hasAnnouncementStatic) {
        alert('Static announcements are not enabled yet. Run announcement_static_upgrade.sql in Supabase.');
      } else {
        payload.is_static = true;
        if (announcementLabel.trim()) {
          payload.label = announcementLabel.trim();
        }
        if (announcementColor.trim()) {
          payload.color = announcementColor.trim();
        }
      }
    }
    const { error } = await supabase.from('announcements').insert([payload]);
    if (error) {
      setAnnouncementStatus(`Failed: ${error.message}`);
      return;
    }
    setAnnouncementText('');
    setAnnouncementStatic(false);
    setAnnouncementLabel('NOTICE');
    setAnnouncementColor('#0f766e');
    setAnnouncementStatus('Published.');
    loadAnnouncements();
  }

  async function deleteAnnouncement(id) {
    await supabase.from('announcements').delete().eq('id', id);
    loadAnnouncements();
  }

  async function openConversation(conversationId) {
    setCurrentConversation(conversationId);
    const meta = conversations.find((item) => item.id === conversationId) || null;
    setCurrentConversationMeta(meta);
    await loadConversationMessages(conversationId);
  }

  async function updateConversationStatus(nextStatus) {
    if (!currentConversation) return;
    const payload = { status: nextStatus };
    if (hasConversationClosedAt) {
      payload.closed_at = nextStatus === 'closed' ? new Date().toISOString() : null;
    }
    await supabase.from('conversations').update(payload).eq('id', currentConversation);
    await loadConversations();
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', currentConversation)
      .maybeSingle();
    setCurrentConversationMeta(data || null);
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!currentConversation || !replyText.trim()) return;
    if (currentConversationMeta?.status === 'closed') return;
    await supabase.from('conversation_messages').insert([
      {
        conversation_id: currentConversation,
        sender: session?.user?.email || 'Mason Admin',
        body: replyText.trim(),
        sender_role: 'admin'
      }
    ]);
    if (hasConversationLastMessageAt) {
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', currentConversation);
    }
    setReplyText('');
    await loadConversationMessages(currentConversation);
  }

  async function updateReviewReply(reviewId) {
    const existing = reviews.find((review) => review.id === reviewId);
    const current = existing?.mason_reply || '';
    const nextReply = window.prompt('Reply as Mason:', current);
    if (nextReply === null) return;
    await supabase.from('reviews').update({ mason_reply: nextReply }).eq('id', reviewId);
    loadReviews();
  }

  async function editReview(reviewId) {
    const existing = reviews.find((review) => review.id === reviewId);
    const nextComment = window.prompt('Edit review comment:', existing?.comment || '');
    if (nextComment === null) return;
    const nextRating = window.prompt('Edit rating (0-5):', String(existing?.rating ?? 0));
    if (nextRating === null) return;
    await supabase
      .from('reviews')
      .update({ comment: nextComment, rating: Number(nextRating) })
      .eq('id', reviewId);
    loadReviews();
  }

  async function deleteReview(reviewId) {
    if (!window.confirm('Delete this review?')) return;
    await supabase.from('reviews').delete().eq('id', reviewId);
    loadReviews();
  }

  function handleSessionChange(event) {
    const { name, value } = event.target;
    setSessionForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleTicketChange(event) {
    const { name, value } = event.target;
    setTicketForm((prev) => ({ ...prev, [name]: value }));
  }

  async function createTicket(event) {
    event.preventDefault();
    if (!ticketForm.customer_name.trim()) return;
    const payload = {
      customer_name: ticketForm.customer_name.trim(),
      status: 'open'
    };
    if (hasConversationSubject && ticketForm.subject.trim()) {
      payload.subject = ticketForm.subject.trim();
    }
    await supabase.from('conversations').insert([payload]);
    setTicketForm({ customer_name: '', subject: '' });
    loadConversations();
  }

  async function createSession(event) {
    event.preventDefault();
    if (!sessionForm.customer_name.trim() || !sessionForm.contact.trim()) return;
    await supabase.from('sessions').insert([
      {
        customer_name: sessionForm.customer_name.trim(),
        contact: sessionForm.contact.trim(),
        details: sessionForm.details.trim(),
        scheduled_for: sessionForm.scheduled_for || null
      }
    ]);
    setSessionForm({
      customer_name: '',
      contact: '',
      details: '',
      scheduled_for: ''
    });
    loadSessions();
  }

  if (authLoading) {
    return (
      <div className="screen">
        <div className="card">
          <h2>Loading Mason Admin</h2>
          <p className="muted">Authenticating secure session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="screen">
        <div className="card auth">
          <div>
            <p className="eyebrow">Mason Admin Access</p>
            <h1>Sign in to continue</h1>
            <p className="muted">
              This admin console is isolated from the public website. Approved admins only.
            </p>
          </div>
          <form onSubmit={handleLogin} className="auth-form">
            <label>
              Email
              <input type="email" name="email" placeholder="you@company.com" required />
            </label>
            <label>
              Password
              <input type="password" name="password" placeholder="••••••••" required />
            </label>
            <button type="submit">Sign In</button>
            {adminState.error ? <p className="error">{adminState.error}</p> : null}
          </form>
        </div>
      </div>
    );
  }

  if (adminState.status === 'checking') {
    return (
      <div className="screen">
        <div className="card">
          <h2>Verifying admin access</h2>
          <p className="muted">Checking admin permissions for {session.user.email}.</p>
        </div>
      </div>
    );
  }

  if (adminState.status !== 'allowed') {
    return (
      <div className="screen">
        <div className="card">
          <h2>Access denied</h2>
          <p className="muted">
            {adminState.error || 'Your account is not registered as an admin yet.'}
          </p>
          <button type="button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">MA</div>
          <div>
            <p className="eyebrow">Mason Admin</p>
            <p className="muted">Operations Console</p>
          </div>
        </div>
        <nav className="nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={tab.id === activeTab ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="profile">
          <div>
            <p className="muted">Signed in</p>
            <p className="profile-name">{session.user.email}</p>
          </div>
          <button type="button" onClick={handleLogout} className="ghost">
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="header">
          <div>
            <h1>{TABS.find((tab) => tab.id === activeTab)?.label}</h1>
            <p className="muted">Realtime operations snapshot for Mason portal data.</p>
          </div>
          <div className="header-actions">
            <button type="button" onClick={loadDashboard} className="ghost">
              Refresh
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <section className="grid">
            {Object.entries(counts).map(([label, value]) => (
              <div key={label} className="card stat">
                <p className="muted">{label}</p>
                <h2>{value}</h2>
              </div>
            ))}
            <div className="card note">
              <h3>Admin playbook</h3>
              <p className="muted">
                This console mirrors Mason portal activity in one secure workspace. Use the
                navigation to respond to conversations, publish announcements, and keep sessions
                moving.
              </p>
            </div>
          </section>
        )}

        {activeTab === 'announcements' && (
          <section className="stack">
            <form className="card form" onSubmit={submitAnnouncement}>
              <h3>Post announcement</h3>
              <textarea
                value={announcementText}
                onChange={(event) => setAnnouncementText(event.target.value)}
                rows={3}
                placeholder="Write a short announcement for clients."
              />
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={announcementStatic}
                  onChange={(event) => setAnnouncementStatic(event.target.checked)}
                />
                Static top bar (stays until deleted)
              </label>
              {announcementStatic && (
                <label>
                  Label
                  <input
                    type="text"
                    value={announcementLabel}
                    onChange={(event) => setAnnouncementLabel(event.target.value)}
                    placeholder="NOTICE"
                  />
                </label>
              )}
              {announcementStatic && (
                <label>
                  Banner color
                  <input
                    type="color"
                    value={announcementColor}
                    onChange={(event) => setAnnouncementColor(event.target.value)}
                  />
                </label>
              )}
              {announcementStatus && <p className="muted">{announcementStatus}</p>}
              <button type="submit">Publish</button>
            </form>
            <div className="card list">
              <h3>Recent announcements</h3>
              {announcements.length === 0 && <p className="muted">No announcements yet.</p>}
              {announcements.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <p>{item.message}</p>
                    <p className="muted">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                    </p>
                    {item.is_static && <span className="pill">Static bar</span>}
                  </div>
                  <button type="button" className="danger" onClick={() => deleteAnnouncement(item.id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'conversations' && (
          <section className="two-col">
            <div className="card list">
              <h3>Client conversations</h3>
              <form className="form" onSubmit={createTicket}>
                <label>
                  Client name
                  <input
                    name="customer_name"
                    value={ticketForm.customer_name}
                    onChange={handleTicketChange}
                    placeholder="Client name"
                  />
                </label>
                <label>
                  Subject (optional)
                  <input
                    name="subject"
                    value={ticketForm.subject}
                    onChange={handleTicketChange}
                    placeholder="Ticket subject"
                  />
                </label>
                <button type="submit">Create ticket</button>
              </form>
              {conversations.length === 0 && <p className="muted">No conversations yet.</p>}
              {conversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation.id}
                  className={`list-row ${currentConversation === conversation.id ? 'selected' : ''}`}
                  onClick={() => openConversation(conversation.id)}
                >
                  <div>
                    <p>{conversation.customer_name || 'Anonymous'}</p>
                    <p className="muted">
                      {hasConversationSubject && conversation.subject
                        ? conversation.subject
                        : conversation.status || 'open'}
                    </p>
                  </div>
                  <span className="pill">{conversation.id.slice(0, 6)}</span>
                </button>
              ))}
            </div>
            <div className="card list">
              <h3>Thread</h3>
              {!currentConversation && <p className="muted">Pick a conversation to review.</p>}
              {currentConversation && (
                <div className="list-row" style={{ padding: '0.75rem 1rem' }}>
                  <div>
                    <p>{currentConversationMeta?.customer_name || 'Customer'}</p>
                    <p className="muted">
                      {currentConversationMeta?.status || 'open'}
                    </p>
                  </div>
                  <div className="review-actions">
                    {currentConversationMeta?.status === 'closed' ? (
                      <button type="button" onClick={() => updateConversationStatus('open')}>
                        Reopen
                      </button>
                    ) : (
                      <button type="button" className="ghost" onClick={() => updateConversationStatus('closed')}>
                        Close ticket
                      </button>
                    )}
                    <button
                      type="button"
                      className="danger"
                      onClick={async () => {
                        if (!currentConversation) return;
                        if (!window.confirm('Delete this ticket and all messages?')) return;
                        const { error } = await supabase
                          .from('conversations')
                          .delete()
                          .eq('id', currentConversation);
                        if (error) {
                          alert(`Delete failed: ${error.message}`);
                          return;
                        }
                        setCurrentConversation(null);
                        setCurrentConversationMeta(null);
                        setConversationMessages([]);
                        loadConversations();
                      }}
                    >
                      Delete ticket
                    </button>
                  </div>
                </div>
              )}
              {conversationMessages.map((message) => (
                <div key={message.id} className="message">
                  <div className="message-meta">
                    <span>{message.sender || 'Unknown'}</span>
                    <span>{message.sender_role}</span>
                  </div>
                  <p>{message.body}</p>
                </div>
              ))}
              {currentConversation && (
                <form className="reply" onSubmit={sendReply}>
                  <textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    rows={3}
                    placeholder={
                      currentConversationMeta?.status === 'closed'
                        ? 'Ticket is closed'
                        : 'Reply as admin...'
                    }
                    disabled={currentConversationMeta?.status === 'closed'}
                  />
                  <button type="submit" disabled={currentConversationMeta?.status === 'closed'}>
                    Send reply
                  </button>
                </form>
              )}
            </div>
          </section>
        )}

        {activeTab === 'reviews' && (
          <section className="stack">
            <div className="card list">
              <h3>Latest reviews</h3>
              {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
              {reviews.map((review) => (
                <div key={review.id} className="review">
                  <div>
                    <p className="review-title">
                      {review.name || 'Anonymous'} <span className="pill">{review.rating}★</span>
                    </p>
                    <p>{review.comment}</p>
                    {review.mason_reply && (
                      <p className="muted">Mason reply: {review.mason_reply}</p>
                    )}
                  </div>
                  <div className="review-actions">
                    <button type="button" onClick={() => updateReviewReply(review.id)}>
                      {review.mason_reply ? 'Edit reply' : 'Reply'}
                    </button>
                    <button type="button" className="ghost" onClick={() => editReview(review.id)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => deleteReview(review.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'sessions' && (
          <section className="two-col">
            <form className="card form" onSubmit={createSession}>
              <h3>Create session</h3>
              <label>
                Client name
                <input
                  name="customer_name"
                  value={sessionForm.customer_name}
                  onChange={handleSessionChange}
                  placeholder="Client name"
                />
              </label>
              <label>
                Contact
                <input
                  name="contact"
                  value={sessionForm.contact}
                  onChange={handleSessionChange}
                  placeholder="Phone or email"
                />
              </label>
              <label>
                Details
                <textarea
                  name="details"
                  value={sessionForm.details}
                  onChange={handleSessionChange}
                  rows={3}
                  placeholder="Session notes"
                />
              </label>
              <label>
                Scheduled for
                <input
                  type="datetime-local"
                  name="scheduled_for"
                  value={sessionForm.scheduled_for}
                  onChange={handleSessionChange}
                />
              </label>
              <button type="submit">Save session</button>
            </form>
            <div className="card list">
              <h3>Upcoming sessions</h3>
              {sessions.length === 0 && <p className="muted">No sessions scheduled yet.</p>}
              {sessions.map((sessionItem) => (
                <div key={sessionItem.id} className="list-row">
                  <div>
                    <p>{sessionItem.customer_name || 'Session'}</p>
                    <p className="muted">
                      {sessionItem.scheduled_for
                        ? new Date(sessionItem.scheduled_for).toLocaleString()
                        : 'Not scheduled'}
                    </p>
                  </div>
                  <span className="pill">{sessionItem.status || 'requested'}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
