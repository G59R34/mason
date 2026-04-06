import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * When the URL contains a hash (e.g. /#reviews), scroll the matching section into view.
 * Retries briefly so content rendered after paint (and motion) still scrolls correctly.
 */
export function useHashScroll() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (pathname !== '/' || !hash) return;
    const id = hash.replace(/^#/, '');
    if (!id) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12;

    const tryScroll = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) {
        requestAnimationFrame(tryScroll);
      }
    };

    const t = window.setTimeout(tryScroll, 50);
    requestAnimationFrame(tryScroll);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [pathname, hash]);
}
