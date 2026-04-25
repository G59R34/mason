type Props = {
  onReload: () => void;
  onSettings: () => void;
  /** Compact labels on narrow widths */
  compact?: boolean;
};

function IconReload() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

export function ControlDock({ onReload, onSettings, compact }: Props) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center px-3 pb-[var(--hh-safe-b)] pt-2"
      style={{ paddingLeft: "max(12px, env(safe-area-inset-left))", paddingRight: "max(12px, env(safe-area-inset-right))" }}
    >
      <div
        className="pointer-events-auto hh-glass flex max-w-lg flex-1 items-stretch gap-2 rounded-[1.35rem] p-2"
        role="toolbar"
        aria-label="Handheld controls"
      >
        <button
          type="button"
          data-shell-focusable="true"
          tabIndex={0}
          className="hh-focus flex min-h-[64px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-white/[0.04] px-3 text-zinc-200 transition hover:bg-violet-500/15"
          onClick={onReload}
        >
          <IconReload />
          {!compact && <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Reload</span>}
        </button>
        <button
          type="button"
          data-shell-focusable="true"
          tabIndex={0}
          className="hh-focus flex min-h-[64px] min-w-0 flex-[1.15] flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-b from-violet-600/90 to-violet-800/95 px-4 text-white shadow-lg shadow-violet-950/50 transition hover:from-violet-500 hover:to-violet-700"
          onClick={onSettings}
        >
          <IconMenu />
          {!compact && <span className="text-[11px] font-bold uppercase tracking-wider text-violet-100/90">System</span>}
        </button>
      </div>
    </div>
  );
}
