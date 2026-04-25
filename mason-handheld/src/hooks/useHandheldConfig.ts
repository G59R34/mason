import { Store } from "@tauri-apps/plugin-store";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CONFIG_KEY,
  DEFAULT_CONFIG,
  type HandheldConfig,
  mergeConfig,
  resolveWebUrl,
} from "@/lib/config";

const LEGACY_CONFIG_KEY = "handheld_config_v1";

function migrateLegacyConfig(v1: Record<string, unknown>): Partial<HandheldConfig> {
  return {
    productionUrl: typeof v1.productionUrl === "string" ? v1.productionUrl : "",
    devUrl: typeof v1.devUrl === "string" ? v1.devUrl : DEFAULT_CONFIG.devUrl,
    useDevUrl: v1.useDevUrl !== false,
    loadTimeoutMs: typeof v1.loadTimeoutMs === "number" ? v1.loadTimeoutMs : DEFAULT_CONFIG.loadTimeoutMs,
    startFullscreen: Boolean(v1.startFullscreen),
    appendEmbedParam: true,
  };
}

const STORE_PATH = "mason-handheld.json";

let storePromise: Promise<Store> | null = null;

function getStore() {
  if (!storePromise) {
    storePromise = Store.load(STORE_PATH, {
      defaults: { [CONFIG_KEY]: DEFAULT_CONFIG },
      autoSave: true,
    });
  }
  return storePromise;
}

export function useHandheldConfig() {
  const [config, setConfig] = useState<HandheldConfig>(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        const store = await getStore();
        let raw = await store.get<Partial<HandheldConfig>>(CONFIG_KEY);
        if (!raw) {
          const legacy = await store.get<Record<string, unknown>>(LEGACY_CONFIG_KEY);
          if (legacy) {
            raw = migrateLegacyConfig(legacy);
            await store.set(CONFIG_KEY, mergeConfig(raw));
            await store.save();
          }
        }
        if (!cancelled) {
          setConfig(mergeConfig(raw));
          setReady(true);
        }
        unlisten = await store.onKeyChange<Partial<HandheldConfig> | undefined>(CONFIG_KEY, (val) => {
          setConfig(mergeConfig(val ?? {}));
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load config");
          setConfig(DEFAULT_CONFIG);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const updateConfig = useCallback(async (patch: Partial<HandheldConfig>) => {
    const next = mergeConfig({ ...config, ...patch });
    setConfig(next);
    try {
      const store = await getStore();
      await store.set(CONFIG_KEY, next);
      await store.save();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save config");
    }
  }, [config]);

  const resetConfig = useCallback(async () => {
    setConfig(DEFAULT_CONFIG);
    try {
      const store = await getStore();
      await store.set(CONFIG_KEY, DEFAULT_CONFIG);
      await store.save();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset config");
    }
  }, []);

  const webUrl = useMemo(() => resolveWebUrl(config), [config]);

  return {
    config,
    webUrl,
    ready,
    error,
    updateConfig,
    resetConfig,
  };
}
