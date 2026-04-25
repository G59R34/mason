import { useEffect } from 'react';

/**
 * Drives --imm-scroll (0..1) over the full document scroll range for CSS + WebGL.
 * Falls back to 0 when there is nothing to scroll.
 */
export function useImmersiveScrollVar() {
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const t = Math.min(1, Math.max(0, y / max));
      document.documentElement.style.setProperty('--imm-scroll', t.toFixed(4));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.documentElement.style.removeProperty('--imm-scroll');
    };
  }, []);
}
