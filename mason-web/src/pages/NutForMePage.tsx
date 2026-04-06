import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CustomAudioPlayer } from '../components/CustomAudioPlayer';

const TRACK_SLUG = 'nutforme';

export function NutForMePage() {
  const [reviews, setReviews] = useState<{ name: string; comment: string; rating: number; created_at: string }[]>([]);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('');
  const [avg, setAvg] = useState<number | null>(null);

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
    <>
      <section className="card hero">
        <div>
          <h1>Nut For Me</h1>
          <p className="muted">Pegger Productions</p>
          <div style={{ marginTop: 20 }}>
            <CustomAudioPlayer src="/nutforme.mp3" aria-label="Play Nut For Me" />
          </div>
        </div>
      </section>
      <section className="card section">
        <h2>Review this track</h2>
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
        <div className="section-head">
          <h2>Reviews</h2>
          {avg != null && <span className="muted">Average {avg.toFixed(1)}</span>}
        </div>
        {reviews.map((r, i) => (
          <div key={i} className="review-card" style={{ marginBottom: 12 }}>
            <div className="review-meta">
              <span>{r.name}</span>
              <span>{r.rating}★</span>
            </div>
            <p style={{ marginTop: 8 }}>{r.comment}</p>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              {new Date(r.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
      </section>
    </>
  );
}
