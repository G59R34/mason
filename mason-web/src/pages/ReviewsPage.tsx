import { useCallback, useEffect, useState } from 'react';
import { ReviewItem } from '../components/ReviewItem';
import { SectionIntro } from '../components/SectionIntro';
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
  const [showAll, setShowAll] = useState(false);

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

  return (
    <div>
      <SectionIntro eyebrow="Reviews" title="What clients say" lead="Ratings and replies from real sessions.">
        <div className="rating">
          <strong>{avg.toFixed(1)}</strong>
          <span className="rating__stars" aria-hidden>
            {stars(avg)}
          </span>
          <span className="muted">{list.length} reviews</span>
        </div>
      </SectionIntro>

      {loadError && (
        <p className="notice notice--error">
          {loadError} — confirm <code>.env</code> has <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
        </p>
      )}

      {extras && (!extras.replies || !extras.votes) ? (
        <p className="notice">
          Replies and voting are unavailable until the review tables are added in Supabase.
        </p>
      ) : null}

      <details className="disclosure">
        <summary>Write a review</summary>
        <form className="form" onSubmit={submit}>
          <div className="form-grid-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              aria-label="Your name"
              required
            />
            <select value={rating} onChange={(e) => setRating(e.target.value)} aria-label="Rating" required>
              <option value="">Rating</option>
              {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write your review..."
            aria-label="Your review"
            required
            rows={4}
          />
          <button type="submit" className="btn btn--sm">
            Submit review
          </button>
        </form>
      </details>

      <div className="review-list">
        {(showAll ? list : list.slice(0, 4)).map((r) => (
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
        {list.length === 0 && <p className="muted">No reviews yet. Be the first.</p>}
        {!showAll && list.length > 4 ? (
          <button type="button" className="btn btn-ghost" onClick={() => setShowAll(true)}>
            Show all {list.length} reviews
          </button>
        ) : null}
      </div>
    </div>
  );
}
