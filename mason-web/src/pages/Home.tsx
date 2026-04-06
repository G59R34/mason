import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchReviews } from '../lib/reviews';

type Review = {
  name: string | null;
  comment: string | null;
  rating: number | null;
  created_at: string | null;
  verified?: boolean;
  owner?: string | null;
};

export function Home() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  useEffect(() => {
    let sub: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      try {
        const { rows, error } = await fetchReviews({ limit: 3 });
        if (error) {
          console.warn('reviews load', error);
          setReviewsError(error.message || 'Could not load reviews');
          setReviews([]);
          return;
        }
        setReviewsError(null);
        setReviews(rows as Review[]);
      } catch (e) {
        console.warn('reviews load', e);
        setReviewsError(e instanceof Error ? e.message : 'Could not load reviews');
        setReviews([]);
      }
    }

    load();
    sub = supabase
      .channel('home_reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => load())
      .subscribe();

    return () => {
      if (sub) supabase.removeChannel(sub);
    };
  }, []);

  return (
    <>
      <section className="card hero reveal">
        <div>
          <h1 className="delay-1" style={{ animation: 'revealUp 0.7s ease forwards' }}>
            Hello, I&apos;m Mason.
          </h1>
          <p className="muted delay-2" style={{ animation: 'revealUp 0.7s 0.08s ease forwards', opacity: 0 }}>
            Book a private session and I will FUCK you.
          </p>
          <div className="section" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link to="/pricing" className="btn">
              Book a session
            </Link>
            <Link to="/reviews" className="btn btn-ghost">
              See reviews
            </Link>
            <Link to="/forums" className="btn btn-ghost">
              Open forums
            </Link>
          </div>
          <div className="stat-grid">
            <div className="stat-card">
              <strong>Slow replies</strong>
              Most clients hear back within a month.
            </div>
            <div className="stat-card">
              <strong>Foggy Inconsistent scheduling</strong>
              Everything is confirmed at some point.
            </div>
            <div className="stat-card">
              <strong>Private chat</strong>
              Secure, real-time updates on you FUCK session.
            </div>
          </div>
        </div>
        <div className="hero-media">
          <img src="/img/mason.png" alt="Mason" />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Recent reviews</h2>
          <Link to="/reviews">View all</Link>
        </div>
        <div className="grid">
          {reviews === null && <div className="card muted">Loading reviews…</div>}
          {reviewsError && reviews && reviews.length === 0 && (
            <div className="card muted" style={{ borderColor: 'rgba(248, 113, 113, 0.35)' }}>
              {reviewsError}. Check <code style={{ fontSize: '0.9em' }}>VITE_SUPABASE_URL</code> and{' '}
              <code style={{ fontSize: '0.9em' }}>VITE_SUPABASE_ANON_KEY</code> in <code style={{ fontSize: '0.9em' }}>.env</code>.
            </div>
          )}
          {!reviewsError && reviews && reviews.length === 0 && <div className="muted">No reviews yet.</div>}
          {reviews?.map((r, i) => {
            const verified = !!(r.verified || r.owner);
            const comment = (r.comment || '').trim();
            const short = comment.length > 140 ? `${comment.slice(0, 137)}…` : comment;
            return (
              <div key={i} className="review-card">
                <div className="review-meta">
                  <span>{r.name || 'Anonymous'}</span>
                  {verified && <span className="verified-badge">VERIFIED</span>}
                  <span style={{ color: 'var(--accent-warm)' }}>{r.rating ?? 0}★</span>
                </div>
                <div style={{ marginTop: 8 }}>{short}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card section">
        <div className="section-head">
          <h2>From Mason</h2>
        </div>
        <blockquote className="quote">You WILL get FUCKED</blockquote>
      </section>
    </>
  );
}
