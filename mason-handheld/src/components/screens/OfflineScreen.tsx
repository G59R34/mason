import { ShellButton } from "@/components/ui/ShellButton";

type Props = {
  onRetry: () => void;
};

export function OfflineScreen({ onRetry }: Props) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#030304] px-6 py-16">
      <div className="hh-card max-w-md text-center">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-400/95">Offline</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">No connection</h2>
        <p className="mt-4 text-base leading-relaxed text-zinc-500">
          Mason Handheld can&apos;t reach the network. Connect Wi‑Fi or Ethernet on your device, then retry.
        </p>
        <ShellButton variant="primary" className="mt-8 w-full max-w-xs text-lg" onClick={onRetry}>
          Try again
        </ShellButton>
      </div>
    </div>
  );
}
