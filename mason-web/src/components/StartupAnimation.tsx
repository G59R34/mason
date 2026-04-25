import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import '../styles/startup-splash.css';

type Props = {
  onComplete: () => void;
};

const HIDE_AFTER_MS = 2000;
const EXIT_DURATION = 0.5;

const shield = (
  <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="currentColor"
      d="M12 2L2 7v7c0 5 4 8 10 8s10-3 10-8V7l-10-5z"
    />
  </svg>
);

export function StartupAnimation({ onComplete }: Props) {
  const [visible, setVisible] = useState(true);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onComplete();
  };

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), HIDE_AFTER_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <AnimatePresence
      onExitComplete={finish}
      mode="wait"
    >
      {visible && (
        <motion.div
          key="startup-splash"
          className="startup-splash"
          role="presentation"
          aria-hidden
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            filter: 'blur(8px)',
            transition: { duration: EXIT_DURATION, ease: [0.25, 1, 0.5, 1] },
          }}
        >
          <div className="startup-splash__inner">
            <p className="startup-splash__tag">Mason</p>
            <motion.div
              className="startup-splash__glow"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1] }}
            >
              <div className="startup-splash__glow-pulse" aria-hidden />
              <div className="startup-splash__logo-wrap">{shield}</div>
            </motion.div>

            <motion.h1
              className="startup-splash__title"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
            >
              Sex With Mason
            </motion.h1>

            <motion.p
              className="muted"
              style={{ fontSize: '0.9rem', margin: 0, maxWidth: '30ch' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ delay: 0.4, duration: 0.45 }}
            >
              Fuckin you for money.
            </motion.p>

            <motion.div
              className="startup-splash__track"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.35 }}
            >
              <div className="startup-splash__fill" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function shouldShowStartupSplash(): boolean {
  if (typeof window === 'undefined') return false;
  if (document.documentElement.classList.contains('embed-handheld')) return false;
  if (window.location.pathname === '/game' || window.location.pathname.startsWith('/game/')) {
    return false;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  return true;
}
