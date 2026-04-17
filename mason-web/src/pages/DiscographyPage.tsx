import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGlobalPlayer } from '../context/GlobalPlayerContext';
import { supabase } from '../lib/supabase';

type MusicTrackRow = {
  id: string;
  title: string;
  artist: string | null;
  public_url: string;
  sort_order: number | null;
};

const LABEL = 'PEGGER Productions';

export function DiscographyPage() {
  const { playTrack, isActiveTrackId } = useGlobalPlayer();
  const [tracks, setTracks] = useState<MusicTrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: qErr } = await supabase
      .from('music_tracks')
      .select('id, title, artist, public_url, sort_order')
      .order('sort_order', { ascending: true });
    if (qErr) {
      setError(qErr.message);
      setTracks([]);
    } else {
      setTracks((data || []) as MusicTrackRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('mason_discography')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_tracks' }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load]);

  if (loading) {
    return (
      <section className="card">
        <p className="muted">Loading discography…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card">
        <h2>Discography</h2>
        <p className="muted">Could not load tracks ({error}).</p>
        <Link to="/" className="btn">
          Back home
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="card">
        <h1>Discography</h1>
        <p className="muted">
          {LABEL} — stream releases here. 
        </p>
      </section>

      {tracks.length === 0 ? (
        <section className="section card" style={{ borderStyle: 'dashed' }}>
          <h2>No tracks yet</h2>
          <p className="muted">Check back soon for new drops from {LABEL}.</p>
          <Link to="/" className="btn">
            Back home
          </Link>
        </section>
      ) : (
        <div className="section">
          {tracks.map((track) => {
            const subtitle = track.artist?.trim() || LABEL;
            const active = isActiveTrackId(track.id);
            return (
              <article key={track.id} className="card" style={{ marginBottom: 16, padding: '1rem 1.25rem' }}>
                <div style={{ marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{track.title}</h2>
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    {subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  className={`btn${active ? '' : ' btn-ghost'}`}
                  aria-current={active ? 'true' : undefined}
                  onClick={() =>
                    playTrack({
                      id: track.id,
                      title: track.title,
                      subtitle,
                      src: track.public_url,
                    })
                  }
                >
                  {active ? 'Playing in site bar' : 'Play in site bar'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
