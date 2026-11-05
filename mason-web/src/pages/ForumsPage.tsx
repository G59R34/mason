import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SectionIntro } from '../components/SectionIntro';
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
  const detailRef = useRef<HTMLDivElement>(null);

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
    if (selectedId) {
      loadReplies(selectedId);
      if (window.matchMedia('(max-width: 980px)').matches) {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
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

  const voteRow = (score: number, onVote: (delta: number) => void, label: string) => (
    <div className="vote-row">
      <button type="button" className="vote-btn" onClick={() => onVote(1)} aria-label={`Upvote ${label}`}>
        ▲
      </button>
      <span className="vote-row__score">{score}</span>
      <button type="button" className="vote-btn" onClick={() => onVote(-1)} aria-label={`Downvote ${label}`}>
        ▼
      </button>
    </div>
  );

  return (
    <div>
      <SectionIntro eyebrow="Forums" title="The forum" lead="Threads, replies, and voting in one place.">
        <span className="pill">{user ? 'Signed in' : 'Guest mode'}</span>
      </SectionIntro>

      {status && (
        <p className="notice notice--error" role="alert">
          {status}
        </p>
      )}

      <div className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search threads"
          aria-label="Search threads"
          type="search"
        />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort threads">
          <option value="recent">Most recent</option>
          <option value="top">Top voted</option>
          <option value="active">Most active</option>
        </select>
      </div>

      <details className="disclosure">
        <summary>Start a thread</summary>
        <form className="form" onSubmit={postThread}>
          <div className="form-grid-2">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Thread title" aria-label="Thread title" required />
            <select value={newCat} onChange={(e) => setNewCat(e.target.value)} aria-label="Category">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {!user && (
            <input
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              placeholder="Display name (guest)"
              aria-label="Display name"
            />
          )}
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Write your thread..."
            aria-label="Thread body"
            required
            rows={4}
          />
          <button type="submit" className="btn btn--sm">
            Post thread
          </button>
        </form>
      </details>

      <div className={`forums-layout${selected ? ' forums-layout--split' : ''}`}>
        {selected && (
          <div className="card forums-detail" ref={detailRef}>
            <div className="forums-detail__head">
              <h3>{selected.title}</h3>
              <button type="button" className="btn btn-ghost btn--sm" onClick={() => setSelectedId(null)}>
                All threads
              </button>
            </div>

            <div className="review-meta">
              <span>{selected.author_name}</span>
              {(selected.verified || selected.owner) && <span className="verified-badge">VERIFIED</span>}
              <span className="pill">{selected.category}</span>
            </div>

            <p className="post-body">{selected.body}</p>

            {voteRow(votes[selected.id] ?? 0, voteThread, 'thread')}

            <h4 className="subhead subhead--sm">Replies</h4>
            {replies.length === 0 && <p className="muted">No replies yet.</p>}
            <ul className="reply-list">
              {replies.map((r) => (
                <li key={r.id} className="reply-item">
                  <div className="review-meta">
                    <span>{r.author_name}</span>
                    {(r.verified || r.owner) && <span className="verified-badge">VERIFIED</span>}
                    <span className="muted">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="post-body">{r.body}</p>
                  {voteRow(0, (delta) => voteReply(r.id, delta), 'reply')}
                </li>
              ))}
            </ul>

            {!selected.locked ? (
              <form className="form" onSubmit={postReply}>
                {!user && (
                  <input
                    value={replyAuthor}
                    onChange={(e) => setReplyAuthor(e.target.value)}
                    placeholder="Display name (guest)"
                    aria-label="Display name"
                  />
                )}
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Write a reply..."
                  aria-label="Reply"
                  required
                  rows={3}
                />
                <button type="submit" className="btn btn--sm">
                  Reply
                </button>
              </form>
            ) : (
              <p className="muted">Thread locked.</p>
            )}
          </div>
        )}

        <div className="card forums-list">
          <div className="forums-list__head">
            <h3>Threads</h3>
            <span className="muted">{filtered.length}</span>
          </div>

          <ul className="thread-list">
            {filtered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`thread${selectedId === t.id ? ' is-active' : ''}`}
                  onClick={() => setSelectedId(t.id)}
                  aria-pressed={selectedId === t.id}
                >
                  <span className="thread__title">{t.title}</span>
                  <span className="thread__meta">
                    {t.author_name}
                    {(t.verified || t.owner) && <span className="verified-badge">VERIFIED</span>}
                    <span className="pill">{t.category}</span>
                  </span>
                  <span className="thread__excerpt">
                    {(t.body || '').slice(0, 140)}
                    {(t.body || '').length > 140 ? '…' : ''}
                  </span>
                  <span className="thread__foot">
                    <span>{votes[t.id] ?? 0} score</span>
                    <span>{t.reply_count ?? 0} replies</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {filtered.length === 0 && <p className="muted">No threads found.</p>}
        </div>
      </div>
    </div>
  );
}
