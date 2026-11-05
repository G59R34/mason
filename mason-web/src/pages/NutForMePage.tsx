import { useEffect, useState } from 'react';
import { SectionIntro } from '../components/SectionIntro';
import { supabase } from '../lib/supabase';
import { DEFAULT_SITE_TRACK, useGlobalPlayer } from '../context/GlobalPlayerContext';

const TRACK_SLUG = 'nutforme';

export function NutForMePage() {
  const { playTrack, isActiveTrackId } = useGlobalPlayer();
  const [reviews, setReviews] = useState<{ name: string; comment: string; rating: number; created_at: string }[]>([]);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('');
  const [avg, setAvg] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from('track_reviews')
      .select('name, comment, rating, created_at')
      .eq('track_slug', TRACK_SLUG)
      .order('created_at', { ascending: false });
    if (error) {
      setReviews([]);
      return;
    }
    const rows = data || [];
    setReviews(rows);
    if (rows.length) setAvg(rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length);
    else setAvg(null);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = parseFloat(rating);
    if (!name.trim() || !comment.trim() || Number.isNaN(r)) return;
    const { error } = await supabase.from('track_reviews').insert([
      { track_slug: TRACK_SLUG, name: name.trim(), comment: comment.trim(), rating: r },
    ]);
    if (error) return;
    setName('');
    setComment('');
    setRating('');
    load();
  }

  return (
    <div>
      <SectionIntro eyebrow="Music" title="Nut For Me" lead="Pegger Productions — stream the single, leave a rating.">
        {avg != null ? <span className="pill">★ {avg.toFixed(1)} average</span> : null}
      </SectionIntro>

      <div className="track-card">
        <div className="track-card__art" aria-hidden>
          ♪
        </div>
        <div className="track-card__copy">
          <h3>Nut For Me</h3>
          <p className="muted">Pegger Productions</p>
        </div>
        <button
          type="button"
          className={isActiveTrackId(DEFAULT_SITE_TRACK.id) ? 'btn' : 'btn btn-ghost'}
          onClick={() => playTrack(DEFAULT_SITE_TRACK)}
        >
          {isActiveTrackId(DEFAULT_SITE_TRACK.id) ? 'Playing in site bar' : 'Play in site bar'}
        </button>
      </div>

      <details className="disclosure">
        <summary>Review this track</summary>
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

      {reviews.length === 0 ? (
        <p className="muted">No reviews yet.</p>
      ) : (
        <ul className="review-grid">
          {(showAll ? reviews : reviews.slice(0, 6)).map((r, i) => (
            <li key={`${r.name}-${i}`} className="review-card">
              <div className="review-meta">
                <strong>{r.name}</strong>
                <span className="rating__stars" aria-hidden>
                  {'★'.repeat(Math.round(Number(r.rating)))}
                </span>
              </div>
              <p>{r.comment}</p>
              <p className="muted meta-small">{new Date(r.created_at).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}

      {!showAll && reviews.length > 6 ? (
        <button type="button" className="btn btn-ghost track-reviews-more" onClick={() => setShowAll(true)}>
          Show all {reviews.length} track reviews
        </button>
      ) : null}
    </div>
  );
}
