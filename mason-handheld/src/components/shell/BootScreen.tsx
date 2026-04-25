export function BootScreen({ message = "Loading Mason…" }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-[#030304] px-8">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div className="hh-pulse-ring absolute inset-0 rounded-[2rem] border-2 border-violet-500/30" aria-hidden />
        <div className="absolute inset-3 rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/30 to-zinc-900/80 shadow-[0_0_60px_rgba(139,92,246,0.25)]" />
        <svg width="44" height="44" viewBox="0 0 24 24" className="relative text-violet-200" aria-hidden>
          <path
            fill="currentColor"
            d="M12 2L2 7v7c0 5 4 8 10 8s10-3 10-8V7l-10-5z"
          />
        </svg>
      </div>
      <div className="max-w-xs text-center">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-violet-400/90">Mason Handheld</p>
        <p className="mt-3 text-base font-medium text-zinc-400">{message}</p>
      </div>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-zinc-800">
        <div className="hh-shimmer h-full w-full rounded-full bg-violet-500/40" />
      </div>
    </div>
  );
}
