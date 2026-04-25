import { useEffect, useRef } from 'react';

/**
 * Subtle cursor-adjacent glow; pointer-events none. Desktop / fine pointer only.
 */
export function CursorAura() {
  const raf = useRef(0);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const tick = () => {
      const t = 0.14;
      pos.current.x += (target.current.x - pos.current.x) * t;
      pos.current.y += (target.current.y - pos.current.y) * t;
      el.style.setProperty('--cx', `${pos.current.x}px`);
      el.style.setProperty('--cy', `${pos.current.y}px`);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return <div ref={elRef} className="imm-cursor-aura" aria-hidden />;
}
