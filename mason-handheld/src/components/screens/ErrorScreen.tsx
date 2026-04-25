import { ShellButton } from "@/components/ui/ShellButton";

type Props = {
  url: string;
  message?: string;
  onRetry: () => void;
  onOpenSettings: () => void;
};

export function ErrorScreen({ url, message, onRetry, onOpenSettings }: Props) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#030304] px-6 py-16">
      <div className="hh-card max-w-lg text-center">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-rose-400/95">Timeout</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">Couldn&apos;t load in time</h2>
        <p className="mt-2 break-all font-mono text-sm text-zinc-600">{url}</p>
        {message && <p className="mt-4 text-zinc-500">{message}</p>}
        <p className="mt-4 text-base leading-relaxed text-zinc-500">
          Start mason-web locally, check production HTTPS, or raise the load timeout in system settings.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ShellButton variant="primary" className="min-h-[56px] flex-1 text-lg sm:max-w-[200px]" onClick={onRetry}>
            Retry
          </ShellButton>
          <ShellButton className="min-h-[56px] flex-1 text-lg sm:max-w-[200px]" onClick={onOpenSettings}>
            System
          </ShellButton>
        </div>
      </div>
    </div>
  );
}
