import { BootScreen } from "@/components/shell/BootScreen";
import { ControlDock } from "@/components/shell/ControlDock";
import { ImmersiveShell } from "@/components/shell/ImmersiveShell";
import { WebLayer } from "@/components/shell/WebLayer";
import { ErrorScreen } from "@/components/screens/ErrorScreen";
import { OfflineScreen } from "@/components/screens/OfflineScreen";
import { useGamepadShell } from "@/hooks/useGamepadShell";
import { useHandheldConfig } from "@/hooks/useHandheldConfig";
import { useMediaCompact } from "@/hooks/useMediaCompact";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useShellFocus } from "@/hooks/useShellFocus";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function HomePage() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const compactDock = useMediaCompact(480);
  const { config, webUrl, ready } = useHandheldConfig();
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const { focusIndex, confirmFocused } = useShellFocus();

  const reload = useCallback(() => {
    setLoadError(false);
    setReloadToken((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!ready || !config.startFullscreen) return;
    void getCurrentWindow().setFullscreen(true);
  }, [ready, config.startFullscreen]);

  useGamepadShell({
    enabled: ready && online && !loadError,
    onConfirm: confirmFocused,
    onFocusStep: focusIndex,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const shell = document.querySelector("[data-mason-shell]");
      const ae = document.activeElement;
      if (!shell || !ae || !shell.contains(ae)) return;
      if (ae.tagName === "IFRAME") return;
      if (e.key === "Escape") navigate("/settings");
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

  if (!ready) {
    return (
      <div className="relative h-dvh w-full overflow-hidden">
        <BootScreen message="Preparing shell…" />
      </div>
    );
  }

  if (!online) {
    return <OfflineScreen onRetry={() => window.location.reload()} />;
  }

  if (loadError) {
    return (
      <ErrorScreen
        url={webUrl}
        onRetry={reload}
        onOpenSettings={() => navigate("/settings")}
      />
    );
  }

  return (
    <ImmersiveShell
      padBottomForDock
      dock={
        <ControlDock
          compact={compactDock}
          onReload={reload}
          onSettings={() => navigate("/settings")}
        />
      }
    >
      <WebLayer
        url={webUrl}
        reloadNonce={reloadToken}
        loadTimeoutMs={config.loadTimeoutMs}
        online={online}
        onTimeout={() => setLoadError(true)}
      />
    </ImmersiveShell>
  );
}
