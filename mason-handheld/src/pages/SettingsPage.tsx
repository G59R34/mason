import { ShellButton } from "@/components/ui/ShellButton";
import { useGamepadShell } from "@/hooks/useGamepadShell";
import { useHandheldConfig } from "@/hooks/useHandheldConfig";
import { useShellFocus } from "@/hooks/useShellFocus";
import type { HandheldConfig } from "@/lib/config";
import { DEFAULT_CONFIG } from "@/lib/config";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export function SettingsPage() {
  const { config, updateConfig, resetConfig } = useHandheldConfig();
  const navigate = useNavigate();
  const [local, setLocal] = useState<HandheldConfig>(config);
  const [saved, setSaved] = useState(false);
  const [ping, setPing] = useState<string | null>(null);
  const { focusIndex, confirmFocused } = useShellFocus();

  useGamepadShell({
    onConfirm: confirmFocused,
    onBack: () => navigate(-1),
    onFocusStep: focusIndex,
  });

  useEffect(() => {
    setLocal(config);
  }, [config]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate(-1);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        focusIndex(1);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        focusIndex(-1);
      }
      if (e.key === "Enter") confirmFocused();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, focusIndex, confirmFocused]);

  const save = async () => {
    await updateConfig(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testUrl = async (raw: string) => {
    const u = raw.trim();
    if (!u) {
      setPing("Enter a URL first.");
      return;
    }
    setPing("Checking…");
    try {
      const c = new URL(u);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      await fetch(c.toString(), { method: "GET", mode: "cors", signal: ctrl.signal });
      clearTimeout(t);
      setPing("Reachable (CORS allowed).");
    } catch {
      setPing("Could not verify (offline, blocked, or no CORS). URL may still work in the app.");
    }
  };

  const activeUrl = local.useDevUrl ? local.devUrl : local.productionUrl;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col overflow-hidden bg-[#030304]/97 backdrop-blur-2xl">
      <header
        className="shrink-0 border-b border-white/[0.06] px-4 py-4"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <ShellButton
          variant="ghost"
          className="mb-4 min-h-[52px] px-4 text-[15px]"
          onClick={() => navigate(-1)}
          aria-label="Back to Mason"
        >
          ← Mason
        </ShellButton>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-400/90">System</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">Handheld</h2>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-zinc-500">
          URLs, fullscreen, and embed mode for the responsive mason-web layout.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-xl flex-col gap-6 py-4">
          <section className="hh-card space-y-5">
            <h3 className="text-lg font-bold text-white">mason-web endpoints</h3>
            <label className="block space-y-2">
              <span className="text-[13px] font-semibold uppercase tracking-wide text-zinc-500">Production</span>
              <input
                data-shell-focusable="true"
                tabIndex={0}
                className="hh-input font-mono text-[15px]"
                value={local.productionUrl}
                onChange={(e) => setLocal({ ...local, productionUrl: e.target.value })}
                placeholder="https://your-site.example"
                autoComplete="off"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-[13px] font-semibold uppercase tracking-wide text-zinc-500">Dev (Vite)</span>
              <input
                data-shell-focusable="true"
                tabIndex={0}
                className="hh-input font-mono text-[15px]"
                value={local.devUrl}
                onChange={(e) => setLocal({ ...local, devUrl: e.target.value })}
                placeholder="http://127.0.0.1:5173"
                autoComplete="off"
              />
            </label>
            <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-4">
              <input
                data-shell-focusable="true"
                tabIndex={0}
                type="checkbox"
                className="mt-1 h-8 w-8 shrink-0 rounded-md border-zinc-600 bg-zinc-900 accent-violet-500"
                checked={local.useDevUrl}
                onChange={(e) => setLocal({ ...local, useDevUrl: e.target.checked })}
              />
              <div>
                <span className="font-semibold text-zinc-100">Use dev URL</span>
                <p className="mt-1 text-sm text-zinc-500">Off for production / deployed mason-web.</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-4">
              <input
                data-shell-focusable="true"
                tabIndex={0}
                type="checkbox"
                className="mt-1 h-8 w-8 shrink-0 rounded-md border-zinc-600 bg-zinc-900 accent-violet-500"
                checked={local.appendEmbedParam}
                onChange={(e) => setLocal({ ...local, appendEmbedParam: e.target.checked })}
              />
              <div>
                <span className="font-semibold text-zinc-100">Handheld web layout</span>
                <p className="mt-1 text-sm text-zinc-500">
                  Appends <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">?embed=handheld</code> so mason-web
                  uses large touch targets, TV-width content, and visible focus for controllers.
                </p>
              </div>
            </label>
            <div className="flex flex-wrap gap-3">
              <ShellButton className="text-[15px]" onClick={() => void testUrl(activeUrl)}>
                Test active URL
              </ShellButton>
              <ShellButton variant="ghost" className="text-[15px]" onClick={() => void openUrl(activeUrl)}>
                Open in browser
              </ShellButton>
            </div>
            {ping && <p className="text-sm text-zinc-500">{ping}</p>}
          </section>

          <section className="hh-card space-y-5">
            <h3 className="text-lg font-bold text-white">Display</h3>
            <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-4">
              <input
                data-shell-focusable="true"
                tabIndex={0}
                type="checkbox"
                className="mt-1 h-8 w-8 shrink-0 rounded-md border-zinc-600 bg-zinc-900 accent-violet-500"
                checked={local.startFullscreen}
                onChange={(e) => setLocal({ ...local, startFullscreen: e.target.checked })}
              />
              <div>
                <span className="font-semibold text-zinc-100">Start fullscreen</span>
                <p className="mt-1 text-sm text-zinc-500">Game Mode / Steam Big Picture.</p>
              </div>
            </label>
            <label className="block space-y-2">
              <span className="text-[13px] font-semibold uppercase tracking-wide text-zinc-500">Load timeout (ms)</span>
              <input
                data-shell-focusable="true"
                tabIndex={0}
                type="number"
                min={5000}
                step={1000}
                className="hh-input"
                value={local.loadTimeoutMs}
                onChange={(e) =>
                  setLocal({ ...local, loadTimeoutMs: Number(e.target.value) || DEFAULT_CONFIG.loadTimeoutMs })
                }
              />
            </label>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ShellButton variant="primary" className="min-h-[56px] flex-1 text-lg" onClick={() => void save()}>
              {saved ? "Saved" : "Save"}
            </ShellButton>
            <ShellButton
              className="min-h-[56px] flex-1 text-lg"
              onClick={() => {
                void resetConfig();
                setLocal(DEFAULT_CONFIG);
              }}
            >
              Reset
            </ShellButton>
          </div>

          <p className="pb-8 text-center text-xs leading-relaxed text-zinc-600">
            Shell: A / Enter · B / Esc back · D-pad & stick move focus. Site uses controller-friendly focus when handheld
            layout is on.
          </p>
        </div>
      </div>
    </div>
  );
}
