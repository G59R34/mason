import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['general', 'sessions', 'flicks', 'support'];
const GUEST_KEY = 'ms_forums_guest_key';

function guestId() {
  let v = localStorage.getItem(GUEST_KEY);
  if (!v) {
    v = `guest-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(GUEST_KEY, v);
  }
  return v;
}

type Thread = {
  id: string;
  title: string;
  body: string;
  category: string;
  author_name: string | null;
  owner?: string | null;
  verified?: boolean;
  locked?: boolean;
  reply_count?: number;
  created_at: string;
};

type Reply = {
  id: string;
  body: string;
  author_name: string | null;
  owner?: string | null;
  verified?: boolean;
  created_at: string;
};

export function ForumsPage() {
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('general');
  const [newAuthor, setNewAuthor] = useState('');
  const [newBody, setNewBody] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
  }, []);

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase
      .from('forums_threads')
      .select('id,title,body,category,author_name,owner,verified,locked,reply_count,created_at')
      .order('created_at', { ascending: false })
      .limit(150);
    if (error) {
      setStatus(error.message);
      setThreads([]);
      return;
    }
    setThreads(data || []);
    const ids = (data || []).map((t) => t.id);
    if (ids.length) {
      const { data: vdata } = await supabase.from('forums_votes').select('thread_id,vote').in('thread_id', ids);
      const map: Record<string, number> = {};
      (vdata || []).forEach((r: { thread_id: string; vote: number }) => {
        map[r.thread_id] = (map[r.thread_id] || 0) + Number(r.vote);
      });
      setVotes(map);
    }
    setStatus('');
  }, []);

  const loadReplies = useCallback(async (tid: string) => {
    const { data } = await supabase
      .from('forums_replies')
      .select('id,body,author_name,owner,verified,created_at')
      .eq('thread_id', tid)
      .order('created_at', { ascending: true });
    setReplies((data || []) as Reply[]);
  }, []);

  useEffect(() => {
    refreshUser();
    loadThreads();
    const sub = supabase.auth.onAuthStateChange(() => refreshUser());
    const ch = supabase
      .channel('forums_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forums_threads' }, () => loadThreads())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forums_replies' }, () => selectedId && loadReplies(selectedId))
      .subscribe();
    return () => {
      sub.data.subscription.unsubscribe();
      supabase.removeChannel(ch);
    };
  }, [refreshUser, loadThreads, loadReplies, selectedId]);

  useEffect(() => {
    if (selectedId) loadReplies(selectedId);
  }, [selectedId, loadReplies]);

  const filtered = useMemo(() => {
    let rows = threads.filter((t) => {
      if (catFilter !== 'all' && t.category !== catFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [t.title, t.body, t.author_name, t.category].join(' ').toLowerCase().includes(q);
    });
    rows = [...rows].sort((a, b) => {
      if (sort === 'top') return (votes[b.id] || 0) - (votes[a.id] || 0);
      if (sort === 'active') return (b.reply_count || 0) - (a.reply_count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return rows;
  }, [threads, catFilter, search, sort, votes]);

  const selected = threads.find((t) => t.id === selectedId);

  async function postThread(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;
    const payload: Record<string, unknown> = {
      title: newTitle.trim(),
      body: newBody.trim(),
      category: newCat,
      author_name: user?.user_metadata?.full_name || user?.email || newAuthor.trim() || 'Guest',
      verified: !!user?.id,
    };
    if (user?.id) payload.owner = user.id;
    const { error } = await supabase.from('forums_threads').insert([payload]);
    if (error) {
      setStatus(error.message);
      return;
    }
    setNewTitle('');
    setNewBody('');
    await loadThreads();
  }

  async function postReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !replyBody.trim() || selected?.locked) return;
    const payload: Record<string, unknown> = {
      thread_id: selectedId,
      body: replyBody.trim(),
      author_name: user?.user_metadata?.full_name || user?.email || replyAuthor.trim() || 'Guest',
      verified: !!user?.id,
    };
    if (user?.id) payload.owner = user.id;
    const { error } = await supabase.from('forums_replies').insert([payload]);
    if (error) {
      setStatus(error.message);
      return;
    }
    setReplyBody('');
    await loadThreads();
    await loadReplies(selectedId);
  }

  const voter = user?.id || guestId();

  async function voteThread(delta: number) {
    if (!selectedId) return;
    const { error } = await supabase.from('forums_votes').upsert(
      {
        thread_id: selectedId,
        reply_id: null,
        voter_key: voter,
        vote: delta,
        owner: user?.id || null,
      },
      { onConflict: 'thread_id,voter_key' }
    );
    if (error) setStatus(error.message);
    await loadThreads();
  }

  async function voteReply(replyId: string, delta: number) {
    const { error } = await supabase.from('forums_votes').upsert(
      {
        thread_id: null,
        reply_id: replyId,
        voter_key: voter,
        vote: delta,
        owner: user?.id || null,
      },
      { onConflict: 'reply_id,voter_key' }
    );
    if (error) setStatus(error.message);
    if (selectedId) await loadReplies(selectedId);
    await loadThreads();
  }

  return (
    <>
      <section className="card">
        <div className="section-head">
          <div>
            <h1>Forums</h1>
            <p className="muted">Threads, replies, and voting in one place.</p>
          </div>
          <span className="pill">{user ? `Signed in` : 'Guest mode'}</span>
        </div>
        {status && <p style={{ color: '#f87171' }}>{status}</p>}
      </section>

      <section className="card section">
        <h2>Start a thread</h2>
        <form className="form" onSubmit={postThread}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Thread title" required style={{ flex: 1, minWidth: 200 }} />
            <select value={newCat} onChange={(e) => setNewCat(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {!user && (
            <input value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} placeholder="Display name (guest)" />
          )}
          <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Write your thread..." required rows={4} />
          <button type="submit" className="btn">
            Post Thread
          </button>
        </form>
      </section>

      <div className="forums-layout section">
        <div className="card">
          <div className="section-head">
            <h2>Threads</h2>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">Most recent</option>
              <option value="top">Top voted</option>
              <option value="active">Most active</option>
            </select>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." style={{ marginBottom: 12 }} />
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ marginBottom: 12 }}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div>
            {filtered.map((t) => (
              <div
                key={t.id}
                className={`forums-thread-item ${selectedId === t.id ? 'active' : ''}`}
                onClick={() => setSelectedId(t.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedId(t.id)}
              >
                <h3 style={{ margin: '0 0 6px' }}>{t.title}</h3>
                <div className="review-meta">
                  <span>{t.author_name}</span>
                  {(t.verified || t.owner) && <span className="verified-badge">VERIFIED</span>}
                  <span className="pill">{t.category}</span>
                </div>
                <p className="muted" style={{ marginTop: 8 }}>
                  {(t.body || '').slice(0, 160)}
                  {(t.body || '').length > 160 ? '…' : ''}
                </p>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="muted">Score {votes[t.id] ?? 0}</span>
                  <span className="muted">{t.reply_count ?? 0} replies</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="muted">No threads found.</p>}
          </div>
        </div>

        <div className="card">
          {!selected && <p className="muted">Select a thread to view replies.</p>}
          {selected && (
            <>
              <h2 style={{ marginTop: 0 }}>{selected.title}</h2>
              <div className="review-meta">
                <span>{selected.author_name}</span>
                {(selected.verified || selected.owner) && <span className="verified-badge">VERIFIED</span>}
              </div>
              <p style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{selected.body}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => voteThread(1)}>
                  Upvote
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => voteThread(-1)}>
                  Downvote
                </button>
              </div>
              <h3 style={{ marginTop: 24 }}>Replies</h3>
              {replies.map((r) => (
                <div key={r.id} className="forums-reply-item">
                  <div className="review-meta">
                    <span>{r.author_name}</span>
                    {(r.verified || r.owner) && <span className="verified-badge">VERIFIED</span>}
                    <span className="muted">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{r.body}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => voteReply(r.id, 1)}>
                      Upvote
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => voteReply(r.id, -1)}>
                      Downvote
                    </button>
                  </div>
                </div>
              ))}
              {!selected.locked ? (
                <form className="form" style={{ marginTop: 16 }} onSubmit={postReply}>
                  {!user && (
                    <input value={replyAuthor} onChange={(e) => setReplyAuthor(e.target.value)} placeholder="Display name (guest)" />
                  )}
                  <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Write a reply..." required rows={3} />
                  <button type="submit" className="btn">
                    Reply
                  </button>
                </form>
              ) : (
                <p className="muted">Thread locked.</p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
