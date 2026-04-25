import { useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

/** Skip WebGL on narrow phones; tablets/desktop keep the scene. */
const WEBGL_MIN_WIDTH_PX = 640;

function isEmbedHandheld() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('embed-handheld');
}

/** Fine pointer (mouse), not touch-primary. */
function isFinePointer() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(pointer: fine)').matches;
}

/**
 * Whether to mount heavy WebGL / cursor FX.
 * Respects embed-handheld, reduced motion, and viewport width.
 */
export function useImmersiveMode() {
  const reduce = useReducedMotion();
  const embed = useMemo(() => isEmbedHandheld(), []);
  const [wideEnough, setWideEnough] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= WEBGL_MIN_WIDTH_PX,
  );

  useEffect(() => {
    const q = () => setWideEnough(window.innerWidth >= WEBGL_MIN_WIDTH_PX);
    q();
    window.addEventListener('resize', q, { passive: true });
    return () => window.removeEventListener('resize', q);
  }, []);

  const showWebGL = !embed && !reduce && wideEnough;
  const showCursorAura = !embed && !reduce && wideEnough && isFinePointer();

  return { showWebGL, showCursorAura, isEmbed: embed, reduce };
}
