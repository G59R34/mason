import { useEffect, useRef, useState } from "react";

type Props = {
  url: string;
  reloadNonce?: number;
  loadTimeoutMs: number;
  online: boolean;
  onReady?: () => void;
  onTimeout?: () => void;
};

/**
 * Full-bleed embedded mason-web (iframe). Parent must be `position: relative` with defined height.
 */
export function WebLayer({ url, reloadNonce = 0, loadTimeoutMs, online, onReady, onTimeout }: Props) {
  const [showBoot, setShowBoot] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedTimeout = useRef(false);

  useEffect(() => {
    firedTimeout.current = false;
    if (!online) {
      setShowBoot(false);
      return;
    }
    setShowBoot(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!firedTimeout.current) {
        firedTimeout.current = true;
        onTimeout?.();
      }
    }, loadTimeoutMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [url, reloadNonce, loadTimeoutMs, online, onTimeout]);

  const onLoad = () => {
    if (timer.current) clearTimeout(timer.current);
    setShowBoot(false);
    onReady?.();
  };

  if (!online) return null;

  if (url === "about:blank") {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-10 text-center">
        <div className="hh-card max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400/90">No URL</p>
          <p className="mt-3 text-lg text-zinc-400">Open the system menu and set your mason-web address.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showBoot && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#030304]/90 backdrop-blur-md"
          aria-busy
          aria-live="polite"
        >
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-zinc-700 border-t-violet-500" />
          <p className="mt-5 text-sm font-medium text-zinc-500">Connecting…</p>
        </div>
      )}
      <iframe
        key={`${url}::${reloadNonce}`}
        title="Mason"
        src={url}
        className="absolute inset-0 z-10 h-full w-full border-0 bg-[#060608]"
        onLoad={onLoad}
        allow="clipboard-read; clipboard-write; fullscreen; geolocation"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </>
  );
}
