import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const BUCKET = 'mason-reels';
const MAX_BYTES = 100 * 1024 * 1024;

type MasonReel = {
  id: string;
  user_id: string;
  title: string | null;
  caption: string | null;
  video_path: string;
  created_at: string;
};

function publicVideoUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function ReelsPage() {
  const { user, loading: authLoading } = useAuth();
  const [reels, setReels] = useState<MasonReel[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadReels = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await supabase
      .from('mason_reels')
      .select('id, user_id, title, caption, video_path, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      setLoadError(
        /relation|does not exist|mason_reels/i.test(error.message)
          ? 'Reels are not set up yet. Run mason_reels.sql in Supabase.'
          : error.message,
      );
      setReels([]);
      return;
    }
    setReels((data || []) as MasonReel[]);
  }, []);

  useEffect(() => {
    void loadReels();
  }, [loadReels]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setStatusMsg(null);
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!file) {
      setStatusMsg('Choose a video file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatusMsg('File must be 100MB or less.');
      return;
    }
    setUploading(true);
    setStatusMsg(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const safeExt = ext && ['mp4', 'webm', 'mov'].includes(ext) ? ext : 'mp4';
    const path = `${user.id}/${crypto.randomUUID()}.${safeExt}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || `video/${safeExt === 'mov' ? 'quicktime' : safeExt}`,
      cacheControl: '3600',
      upsert: false,
    });
    if (upErr) {
      setStatusMsg(upErr.message);
      setUploading(false);
      return;
    }
    const { error: insErr } = await supabase.from('mason_reels').insert({
      user_id: user.id,
      title: title.trim() || null,
      caption: caption.trim() || null,
      video_path: path,
      status: 'published',
    });
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      setStatusMsg(insErr.message);
      setUploading(false);
      return;
    }
    setTitle('');
    setCaption('');
    setFile(null);
    setStatusMsg('Published.');
    setUploading(false);
    void loadReels();
  };

  const removeReel = async (r: MasonReel) => {
    if (!user || user.id !== r.user_id) return;
    if (!window.confirm('Delete this reel?')) return;
    const { error: delRow } = await supabase.from('mason_reels').delete().eq('id', r.id);
    if (delRow) {
      setStatusMsg(delRow.message);
      return;
    }
    const { error: delSt } = await supabase.storage.from(BUCKET).remove([r.video_path]);
    if (delSt) {
      setStatusMsg(`Removed from feed; file cleanup: ${delSt.message}`);
    } else {
      setStatusMsg(null);
    }
    void loadReels();
  };

  return (
    <div className="portal-page reels-page">
      <div className="portal-page-inner">
        <header className="portal-page-head">
          <p className="portal-eyebrow">Video</p>
          <h1>Mason Reels</h1>
          <p className="muted portal-lead">Short videos from the community. Sign in to upload (MP4, WebM, or MOV — up to 100MB).</p>
        </header>

        {authLoading && <p className="muted">Checking session…</p>}

        {!authLoading && !user && (
          <div className="card" style={{ marginBottom: 24 }}>
            <p className="muted" style={{ margin: 0 }}>
              <Link to="/account" className="btn" style={{ marginRight: 12 }}>
                Log in or sign up
              </Link>
              to post a reel. Same account as bookings &amp; support.
            </p>
          </div>
        )}

        {user && (
          <section className="card" style={{ marginBottom: 32 }}>
            <h2 className="section-title-line" style={{ marginTop: 0 }}>
              Upload a reel
            </h2>
            <form className="form" onSubmit={upload}>
              <label>
                Title <span className="muted">(optional)</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a name" />
              </label>
              <label>
                Caption <span className="muted">(optional)</span>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Say something…" rows={2} />
              </label>
              <label>
                Video file
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={onPickFile}
                  disabled={uploading}
                />
              </label>
              {file && (
                <p className="muted" style={{ margin: 0 }}>
                  {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              )}
              {statusMsg && <p className="muted">{statusMsg}</p>}
              <button type="submit" className="btn" disabled={uploading || !file}>
                {uploading ? 'Uploading…' : 'Upload & publish'}
              </button>
            </form>
          </section>
        )}

        {loadError && (
          <div
            className="reviews-debug"
            style={{ borderColor: 'rgba(248, 113, 113, 0.35)' }}
            role="alert"
          >
            {loadError}
          </div>
        )}

        <section>
          <h2 className="section-title-line">Latest reels</h2>
          {reels.length === 0 && !loadError && <p className="muted">No reels yet. Be the first to upload.</p>}

          <ul className="reels-grid">
            {reels.map((r) => {
              const isMine = user?.id === r.user_id;
              const src = publicVideoUrl(r.video_path);
              return (
                <li key={r.id} className="reel-card card">
                  <div className="reel-aspect">
                    <video
                      className="reel-video"
                      src={src}
                      controls
                      playsInline
                      preload="metadata"
                    />
                  </div>
                  <div className="reel-meta">
                    {r.title && <h3 className="reel-title">{r.title}</h3>}
                    {!r.title && <h3 className="reel-title muted">Reel</h3>}
                    {r.caption && <p className="reel-caption muted">{r.caption}</p>}
                    <p className="reel-date muted">
                      {new Date(r.created_at).toLocaleString()}
                      {isMine && <span> · Yours</span>}
                    </p>
                    {isMine && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ marginTop: 8 }}
                        onClick={() => void removeReel(r)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
