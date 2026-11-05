import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SectionIntro } from '../components/SectionIntro';
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

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [lightbox]);

  return (
    <div>
      <SectionIntro eyebrow="Gallery" title="Recent work" lead="New work drops here first." />

      {items.length === 0 ? (
        <div className="empty">
          <h3>No images yet</h3>
          <p className="muted">Check back soon for new shots.</p>
          <Link to={{ pathname: '/', hash: 'contact' }} className="btn btn-ghost">
            Contact Mason
          </Link>
        </div>
      ) : (
        <ul className="gallery-grid">
          {items.map((img, i) => (
            <li key={`${img.public_url}-${i}`}>
              <button type="button" className="gallery-tile" onClick={() => setLightbox(img)}>
                <img src={img.public_url} alt={img.caption || `Gallery image ${i + 1}`} loading="lazy" />
                {img.caption ? <span className="gallery-tile__caption">{img.caption}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {lightbox ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Gallery image" onClick={() => setLightbox(null)}>
          <button type="button" className="lightbox__close" aria-label="Close image" onClick={() => setLightbox(null)}>
            <span aria-hidden>×</span>
          </button>
          <figure className="lightbox__figure" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.public_url} alt={lightbox.caption || 'Gallery image'} />
            {lightbox.caption ? <figcaption>{lightbox.caption}</figcaption> : null}
          </figure>
        </div>
      ) : null}
    </div>
  );
}
