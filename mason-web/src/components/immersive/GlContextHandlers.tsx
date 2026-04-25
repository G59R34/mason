import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Mitigates browser “context lost” churn: allow restore + invalidate after restore.
 * Always call preventDefault on contextlost so the page can recover instead of staying black.
 */
export function GlContextHandlers() {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const el = gl.domElement;

    const onLost = (e: Event) => {
      e.preventDefault();
    };

    const onRestored = () => {
      invalidate();
    };

    el.addEventListener('webglcontextlost', onLost, false);
    el.addEventListener('webglcontextrestored', onRestored, false);

    return () => {
      el.removeEventListener('webglcontextlost', onLost);
      el.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [gl, invalidate]);

  return null;
}
