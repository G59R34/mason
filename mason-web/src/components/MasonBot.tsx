import { useEffect, useRef, useState } from 'react';
import {
  askMasonBot,
  MASON_BOT_GREETING,
  MASON_BOT_STARTERS,
  type MasonBotMessage,
} from '../lib/masonBot';

export function MasonBot() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<MasonBotMessage[]>([]);
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
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
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
                <p className="mason-bot__status">Replies instantly. Not Mason.</p>
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
              <div className="mason-bot__msg is-bot mason-bot__typing" aria-label="Mason Bot is typing">
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
            Mason Bot is an AI impersonating a man who won&apos;t text you back. It can&apos;t book, bill, or
            finish. 18+ only.
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
