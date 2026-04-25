import { useEffect } from 'react';

/**
 * Drives --imm-nav-px / --imm-nav-py in [-1, 1] from pointer position so CSS can
 * tilt the nav rail in sync with the WebGL parallax language (desktop / fine pointer).
 */
export function useNavSceneTilt(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;

    const root = document.documentElement;

    const onMove = (e: PointerEvent) => {
      const px = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const py = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      root.style.setProperty('--imm-nav-px', px.toFixed(4));
      root.style.setProperty('--imm-nav-py', py.toFixed(4));
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    root.style.setProperty('--imm-nav-px', '0');
    root.style.setProperty('--imm-nav-py', '0');

    return () => {
      window.removeEventListener('pointermove', onMove);
      root.style.removeProperty('--imm-nav-px');
      root.style.removeProperty('--imm-nav-py');
    };
  }, [enabled]);
}
