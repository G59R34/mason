import { useEffect } from 'react';

/** Full navigation to a same-origin static HTML page (deploy with legacy files at site root). */
export function LegacyRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return (
    <section className="card section">
      <p className="muted">Opening {href}…</p>
      <p className="muted" style={{ fontSize: '0.9rem' }}>
        If this does not load, open that file from your deployed static site root.
      </p>
    </section>
  );
}
