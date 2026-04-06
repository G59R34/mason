import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Img = { public_url: string; caption?: string | null };

export function GalleryPage() {
  const [items, setItems] = useState<Img[]>([]);
  const [lightbox, setLightbox] = useState<Img | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('gallery_images').select('*').order('sort_order', { ascending: true });
      setItems((data || []) as Img[]);
    })();
  }, []);

  if (!items.length) {
    return (
      <section className="card">
        <h1>Gallery</h1>
        <p className="muted">New work drops here first.</p>
        <div className="section card" style={{ borderStyle: 'dashed' }}>
          <h2>No images yet</h2>
          <p className="muted">Check back soon for new shots.</p>
          <Link to="/contact" className="btn">
            Contact Mason
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="card">
        <h1>Gallery</h1>
        <p className="muted">New work drops here first.</p>
      </section>
      <section className="grid section">
        {items.map((img, i) => (
          <figure
            key={i}
            className="card"
            style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => setLightbox(img)}
          >
            <img src={img.public_url} alt={img.caption || ''} style={{ width: '100%', height: 240, objectFit: 'cover' }} />
            {img.caption && (
              <figcaption className="muted" style={{ padding: 12 }}>
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </section>
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)} role="presentation">
          <div onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.public_url} alt={lightbox.caption || ''} />
            {lightbox.caption && <p className="muted" style={{ textAlign: 'center', marginTop: 12 }}>{lightbox.caption}</p>}
          </div>
        </div>
      )}
    </>
  );
}
