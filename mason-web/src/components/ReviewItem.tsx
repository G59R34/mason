import { useState } from 'react';
import type { ReviewReplyRow } from '../lib/reviewExtras';
import { insertReviewReply, insertReviewVote } from '../lib/reviewExtras';

type ReviewRow = {
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

const VOTER_KEY = 'ms_review_voter';

export function ReviewItem({
  review,
  score,
  replies,
  extras,
  adminIds,
  onUpdated,
}: {
  review: ReviewRow;
  score: number;
  replies: ReviewReplyRow[];
  extras: { replies: boolean; votes: boolean };
  adminIds: Set<string>;
  onUpdated: () => void | Promise<void>;
}) {
  const [voterName, setVoterName] = useState(() => {
    try {
      return localStorage.getItem(VOTER_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyName, setReplyName] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function persistVoter(v: string) {
    setVoterName(v);
    try {
      localStorage.setItem(VOTER_KEY, v);
    } catch {
      /* ignore */
    }
  }

  const reviewOwner = review.owner;
  const showAdminOnReview = !!(reviewOwner && adminIds.has(reviewOwner));

  async function vote(delta: 1 | -1) {
    setBusy(true);
    try {
      const err = await insertReviewVote(review.id, voterName.trim() || null, delta);
      if (err) console.warn('vote', err);
      else await onUpdated();
    } finally {
      setBusy(false);
    }
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setBusy(true);
    try {
      const err = await insertReviewReply(review.id, replyName.trim() || 'Guest', replyMessage.trim());
      if (err) {
        console.warn('reply', err);
        return;
      }
      setReplyMessage('');
      setReplyName('');
      setReplyOpen(false);
      await onUpdated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="review-card review-thread">
      <div className="review-meta">
        <strong>{review.name}</strong>
        {showAdminOnReview && <span className="admin-badge">ADMIN</span>}
        {review.verified && <span className="verified-badge">VERIFIED</span>}
        <span style={{ color: 'var(--accent-warm)' }}>{stars(Number(review.rating))}</span>
        <span className="muted" style={{ marginLeft: 'auto' }}>
          {new Date(review.created_at).toLocaleString()}
        </span>
      </div>
      <p style={{ marginTop: 8 }}>{review.comment}</p>

      {review.mason_reply ? (
        <div className="mason-reply">
          <div className="mason-reply-head">
            <strong>Mason</strong>
            <span className="admin-badge">ADMIN</span>
          </div>
          <div className="mason-reply-body">{review.mason_reply}</div>
        </div>
      ) : null}

      {extras.votes && (
        <div className="review-actions">
          <span className="review-score">Score: {score}</span>
          <input
            type="text"
            className="review-voter-input"
            placeholder="Your name (optional)"
            value={voterName}
            onChange={(e) => persistVoter(e.target.value)}
            aria-label="Voter name for score"
          />
          <button type="button" className="vote-btn" disabled={busy} onClick={() => vote(1)} aria-label="Upvote">
            👍
          </button>
          <button type="button" className="vote-btn" disabled={busy} onClick={() => vote(-1)} aria-label="Downvote">
            👎
          </button>
        </div>
      )}

      {extras.replies && replies.length > 0 && (
        <div className="review-replies-list">
          {replies.map((it) => {
            const adminReply = !!(it.owner && adminIds.has(it.owner));
            return (
              <div key={it.id} className="review-reply-item">
                <div className="review-reply-meta">
                  <strong>{it.name || 'Guest'}</strong>
                  {adminReply && <span className="admin-badge">ADMIN</span>}
                  <span className="muted" style={{ marginLeft: 8, fontSize: '0.88rem' }}>
                    {new Date(it.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ marginTop: 6 }}>{it.message}</div>
              </div>
            );
          })}
        </div>
      )}

      {extras.replies && (
        <div className="review-reply-box">
          <button type="button" className="btn reply-btn" onClick={() => setReplyOpen((o) => !o)}>
            {replyOpen ? 'Cancel' : 'Reply'}
          </button>
          {replyOpen && (
            <form className="form review-reply-form" onSubmit={submitReply}>
              <input value={replyName} onChange={(e) => setReplyName(e.target.value)} placeholder="Your name" />
              <textarea value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Write a reply..." required rows={3} />
              <button type="submit" className="btn" disabled={busy}>
                Send reply
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
