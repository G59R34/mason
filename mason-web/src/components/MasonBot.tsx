import { useEffect, useRef, useState } from 'react';
import {
  askMasonBot,
  maybeDropReview,
  MASON_BOT_GREETING,
  MASON_BOT_STARTERS,
  type MasonBotMessage,
  type MasonBotReview,
} from '../lib/masonBot';

/** Try to drop a review after every Nth message the visitor sends. */
const REVIEW_EVERY_USER_MESSAGES = 3;

export function MasonBot() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<MasonBotMessage[]>([]);
  const [review, setReview] = useState<MasonBotReview | null>(null);
  const lastReviewedUserCountRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, busy, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;

    const next: MasonBotMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    setBusy(true);

    try {
      const reply = await askMasonBot(next);
      const withReply: MasonBotMessage[] = [...next, { role: 'assistant', content: reply }];
      setMessages(withReply);

      const userCount = withReply.filter((m) => m.role === 'user').length;
      if (
        userCount > 0 &&
        userCount % REVIEW_EVERY_USER_MESSAGES === 0 &&
        userCount !== lastReviewedUserCountRef.current
      ) {
        lastReviewedUserCountRef.current = userCount;
        maybeDropReview(withReply)
          .then((dropped) => {
            if (dropped) setReview(dropped);
          })
          .catch(() => {
            /* the review wall is a flourish, never a blocker */
          });
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'No answer.';
      setMessages((prev) => [...prev, { role: 'assistant', content: `Line's dead. ${detail}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={open ? 'mason-bot is-open' : 'mason-bot'}>
      {open ? (
        <section className="mason-bot__panel" role="dialog" aria-label="Mason Bot">
          <header className="mason-bot__head">
            <div className="mason-bot__id">
              <span className="mason-bot__avatar" aria-hidden>
                MB
              </span>
              <div className="mason-bot__meta">
                <p className="mason-bot__name">
                  Mason Bot <span className="mason-bot__badge">AI</span>
                </p>
                <p className="mason-bot__status">Ready to FUCK</p>
              </div>
            </div>
            <button
              type="button"
              className="mason-bot__close"
              onClick={() => setOpen(false)}
              aria-label="Close Mason Bot"
            >
              <span aria-hidden>×</span>
            </button>
          </header>

          <div className="mason-bot__log" ref={logRef} aria-live="polite">
            <div className="mason-bot__msg is-bot">
              <p>{MASON_BOT_GREETING}</p>
            </div>

            {messages.map((message, i) => (
              <div
                key={`${message.role}-${i}`}
                className={message.role === 'user' ? 'mason-bot__msg is-user' : 'mason-bot__msg is-bot'}
              >
                <p>{message.content}</p>
              </div>
            ))}

            {busy ? (
              <div className="mason-bot__msg is-bot mason-bot__typing" aria-label="Mason is typing">
                <span />
                <span />
                <span />
              </div>
            ) : null}
          </div>

          {messages.length === 0 && !busy ? (
            <div className="mason-bot__starters">
              {MASON_BOT_STARTERS.map((starter) => (
                <button key={starter} type="button" onClick={() => send(starter)}>
                  {starter}
                </button>
              ))}
            </div>
          ) : null}

          {review ? (
            <div className="mason-bot__review" role="status">
              <p>
                <strong>Mason Bot just posted a review about you.</strong> {review.rating}★ —{' '}
                <a href="/#reviews" target="_top">
                  read it on the review wall
                </a>
              </p>
            </div>
          ) : null}

          <form
            className="mason-bot__form"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask the cheap version of Mason"
              aria-label="Message Mason Bot"
              maxLength={1500}
            />
            <button type="submit" className="btn btn--sm" disabled={busy || !draft.trim()}>
              Send
            </button>
          </form>

          <p className="mason-bot__fine">
            Mason Bot will E-FUCK you
          </p>
        </section>
      ) : null}

      <button
        type="button"
        className="mason-bot__launcher"
        aria-expanded={open}
        aria-label={open ? 'Close Mason Bot' : 'Chat with Mason Bot'}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="mason-bot__launcher-mark" aria-hidden>
          MB
        </span>
        <span className="mason-bot__launcher-text">
          <strong>Mason Bot</strong>
          <small>The 3% that replies</small>
        </span>
      </button>
    </div>
  );
}
