import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { parseWhatsNewHtml } from '../lib/parseWhatsNewHtml';
import { markWhatsNewSeen, shouldShowWhatsNewModal } from '../lib/whatsNewStorage';

const DEFAULT_BODY_HTML =
  '<p style="margin:0">Here\'s what\'s new on the site:</p>' +
  '<ul class="ms-announcement-updates">' +
  '<li><span class="ms-announcement-dot" aria-hidden="true"></span><span><strong>V2 redesign</strong> — New look and feel: Noir Luxe theme, Syne & DM Sans typography, violet accents, and smoother animations across the site.</span></li>' +
  '<li><span class="ms-announcement-dot" aria-hidden="true"></span><span><strong>Nut For Me</strong> — New track from Pegger Productions. Listen in the banner below the nav and on the dedicated track page.</span></li>' +
  '<li><span class="ms-announcement-dot" aria-hidden="true"></span><span><strong>Custom audio player</strong> — In-site player with play/pause, seek bar, and time display that matches the new design.</span></li>' +
  '<li><span class="ms-announcement-dot" aria-hidden="true"></span><span><strong>Track reviews</strong> — Rate and review "Nut For Me" the same way you do site reviews.</span></li>' +
  '<li><span class="ms-announcement-dot" aria-hidden="true"></span><span><strong>Smoother experience</strong> — Smooth scrolling, scroll-triggered animations, and refined hover states throughout.</span></li>' +
  '</ul>';

type ModalConfig = {
  title: string;
  bodyHtml: string;
  version: number;
};

const DEFAULT_CONFIG: ModalConfig = {
  title: "What's New",
  bodyHtml: DEFAULT_BODY_HTML,
  version: 0,
};

const ease = [0.25, 1, 0.5, 1] as const;

const listContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.055, delayChildren: 0.12 },
  },
};

const listItem = {
  hidden: { opacity: 0, x: -14 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.42, ease },
  },
};

async function fetchModalConfig(): Promise<ModalConfig> {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'announcement_modal')
      .maybeSingle();

    if (error) {
      console.warn('whats new modal', error);
      return DEFAULT_CONFIG;
    }

    const v = data?.value as
      | { title?: string; bodyHtml?: string; version?: number }
      | undefined;

    if (v && (v.title !== undefined || v.bodyHtml !== undefined || v.version !== undefined)) {
      return {
        title: v.title || DEFAULT_CONFIG.title,
        bodyHtml: v.bodyHtml !== undefined ? String(v.bodyHtml) : DEFAULT_CONFIG.bodyHtml,
        version: Number(v.version) || 0,
      };
    }
  } catch (e) {
    console.warn('whats new modal load failed', e);
  }
  return DEFAULT_CONFIG;
}

export function WhatsNewModal() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<ModalConfig>(DEFAULT_CONFIG);

  const applyConfig = useCallback((cfg: ModalConfig) => {
    setConfig(cfg);
    if (shouldShowWhatsNewModal(cfg.version)) {
      setOpen(true);
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    markWhatsNewSeen(config.version);
  }, [config.version]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cfg = await fetchModalConfig();
      if (cancelled) return;
      applyConfig(cfg);
    })();

    const ch = supabase
      .channel('whats_new_modal')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        async (payload) => {
          const key = (payload.new as { key?: string })?.key;
          if (key !== 'announcement_modal') return;
          const cfg = await fetchModalConfig();
          setConfig(cfg);
          if (shouldShowWhatsNewModal(cfg.version)) setOpen(true);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [applyConfig]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const parsed = parseWhatsNewHtml(config.bodyHtml);
  const hasStructured = Boolean(parsed.intro || parsed.items.length);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="whats-new-layer"
          className="whats-new-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.28, ease }}
        >
          <button
            type="button"
            className="whats-new-modal-backdrop"
            aria-label="Close dialog"
            onClick={close}
          />
          <div className="whats-new-modal-center">
            <motion.div
              className="whats-new-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="whats-new-title"
              initial={reduce ? false : { opacity: 0, scale: 0.94, y: 32 }}
              animate={reduce ? undefined : { opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.97, y: 14 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 400, damping: 34, mass: 0.82 }
              }
            >
              <div className="whats-new-dialog-glow" aria-hidden />
              <div className="whats-new-dialog-inner">
                <h2 id="whats-new-title" className="whats-new-title">
                  {config.title}
                </h2>

                {hasStructured ? (
                  <div className="whats-new-body">
                    {parsed.intro && (
                      <motion.p
                        className="whats-new-intro"
                        initial={reduce ? false : { opacity: 0, y: 10 }}
                        animate={reduce ? undefined : { opacity: 1, y: 0 }}
                        transition={{ duration: 0.38, delay: 0.04, ease }}
                      >
                        {parsed.intro}
                      </motion.p>
                    )}
                    <motion.ul
                      className="whats-new-list"
                      variants={reduce ? undefined : listContainer}
                      initial={reduce ? false : 'hidden'}
                      animate={reduce ? undefined : 'visible'}
                    >
                      {parsed.items.map((item, i) => (
                        <motion.li
                          key={`${item.title}-${i}`}
                          className="whats-new-li"
                          variants={reduce ? undefined : listItem}
                        >
                          <span className="whats-new-dot" aria-hidden />
                          <span className="whats-new-li-text">
                            {item.title ? (
                              <>
                                <strong>{item.title}</strong>
                                {item.description ? ` — ${item.description}` : null}
                              </>
                            ) : (
                              item.description
                            )}
                          </span>
                        </motion.li>
                      ))}
                    </motion.ul>
                  </div>
                ) : (
                  <div
                    className="whats-new-body whats-new-body--html"
                    dangerouslySetInnerHTML={{ __html: config.bodyHtml }}
                  />
                )}

                <div className="whats-new-footer">
                  <button type="button" className="btn whats-new-btn" onClick={close}>
                    Got it
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
