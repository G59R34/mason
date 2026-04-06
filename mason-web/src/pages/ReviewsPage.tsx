import { useCallback, useEffect, useState } from 'react';
import { ReviewItem } from '../components/ReviewItem';
import {
  fetchAdminUserIds,
  fetchRepliesForReviewIds,
  fetchVoteScores,
  probeReviewExtras,
  type ReviewReplyRow,
} from '../lib/reviewExtras';
import { supabase } from '../lib/supabase';
import { fetchReviews } from '../lib/reviews';

type Row = {
  id: string;
  name: string;
  comment: string;
  rating: number;
  created_at: string;
  mason_reply?: string | null;
  verified?: boolean;
  owner?: string | null;
};

function stars(n: number) {
  const full = Math.floor(n);
  const half = Math.abs(n - full - 0.5) < 0.001;
  const empty = 5 - full - (half ? 1 : 0);
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

export function ReviewsPage() {
  const [list, setList] = useState<Row[]>([]);
  const [avg, setAvg] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [extras, setExtras] = useState<{ replies: boolean; votes: boolean } | null>(null);
  const [repliesByReview, setRepliesByReview] = useState<Record<string, ReviewReplyRow[]>>({});
  const [voteScores, setVoteScores] = useState<Record<string, number>>({});
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('');

  useEffect(() => {
    fetchAdminUserIds().then(setAdminIds);
  }, []);

  const load = useCallback(async () => {
    const ext = await probeReviewExtras();
    setExtras(ext);

    const { rows, error } = await fetchReviews();
    if (error) {
      console.warn('reviews', error);
      setLoadError(error.message || 'Could not load reviews');
      setList([]);
      setAvg(0);
      setRepliesByReview({});
      setVoteScores({});
      return;
    }
    setLoadError(null);
    const typed = rows as Row[];
    setList(typed);
    if (typed.length) {
      const a = typed.reduce((s, r) => s + Number(r.rating), 0) / typed.length;
      setAvg(a);
    } else {
      setAvg(0);
    }

    const ids = typed.map((r) => r.id);
    if (ext.replies) {
      const { byReview, error: re } = await fetchRepliesForReviewIds(ids);
      if (re) console.warn('replies', re);
      setRepliesByReview(re ? {} : byReview);
    } else {
      setRepliesByReview({});
    }
    if (ext.votes) {
      const { scores, error: ve } = await fetchVoteScores(ids);
      if (ve) console.warn('votes', ve);
      setVoteScores(ve ? {} : scores);
    } else {
      setVoteScores({});
    }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('reviews_pg')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'review_replies' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'review_votes' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = parseFloat(rating);
    if (!name.trim() || !comment.trim() || Number.isNaN(r)) return;
    const { data: u } = await supabase.auth.getUser();
    const payload: Record<string, unknown> = { name: name.trim(), comment: comment.trim(), rating: r };
    if (u?.user?.id) {
      payload.owner = u.user.id;
      payload.verified = true;
    }
    const { error } = await supabase.from('reviews').insert([payload]);
    if (error) {
      const { error: e2 } = await supabase.from('reviews').insert([{ name: name.trim(), comment: comment.trim(), rating: r }]);
      if (e2) {
        alert('Could not submit review');
        return;
      }
    }
    setName('');
    setComment('');
    setRating('');
    await load();
  }

  const extrasMissing =
    extras && (!extras.replies || !extras.votes) ? (
      <div className="reviews-debug">
        Some optional review features are unavailable because database tables are missing. Run{' '}
        <code>add_review_replies_and_votes.sql</code> (or <code>add_review_replies_and_votes_safe.sql</code>) in Supabase to enable
        replies and voting.
      </div>
    ) : null;

  return (
    <>
      <section className="card">
        <div className="section-head">
          <div>
            <h2>Mason Reviews</h2>
            <p style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }} className="muted">
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)' }}>{avg.toFixed(1)}</span>
              <span style={{ color: 'var(--accent-warm)' }}>{stars(avg)}</span>
              <span>({list.length} reviews)</span>
            </p>
            {loadError && (
              <p style={{ color: '#f87171', marginTop: 8 }}>
                {loadError} — confirm <code>.env</code> has <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then
                restart <code>npm run dev</code>.
              </p>
            )}
          </div>
        </div>
      </section>

      {extrasMissing}

      <section className="card section">
        <form className="form" onSubmit={submit}>
          <div className="form-grid-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
            <select value={rating} onChange={(e) => setRating(e.target.value)} required>
              <option value="">Rating</option>
              {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write your review..." required rows={4} />
          <button type="submit" className="btn">
            Submit Review
          </button>
        </form>
      </section>

      <section className="card section">
        <h2 className="section-head">All reviews</h2>
        <div style={{ display: 'grid', gap: 16 }}>
          {list.map((r) => (
            <ReviewItem
              key={r.id}
              review={r}
              score={voteScores[r.id] ?? 0}
              replies={repliesByReview[r.id] ?? []}
              extras={extras ?? { replies: false, votes: false }}
              adminIds={adminIds}
              onUpdated={load}
            />
          ))}
          {list.length === 0 && <p className="muted">No reviews yet.</p>}
        </div>
      </section>
    </>
  );
}
