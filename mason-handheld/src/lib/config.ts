export type HandheldConfig = {
  productionUrl: string;
  devUrl: string;
  useDevUrl: boolean;
  loadTimeoutMs: number;
  startFullscreen: boolean;
  /** Append ?embed=handheld so mason-web loads responsive / controller UI */
  appendEmbedParam: boolean;
};

export const CONFIG_KEY = "handheld_config_v2";

export const DEFAULT_CONFIG: HandheldConfig = {
  productionUrl: "",
  devUrl: "http://127.0.0.1:5173",
  useDevUrl: true,
  loadTimeoutMs: 45_000,
  startFullscreen: false,
  appendEmbedParam: true,
};

const CONFIG_KEYS: (keyof HandheldConfig)[] = [
  "productionUrl",
  "devUrl",
  "useDevUrl",
  "loadTimeoutMs",
  "startFullscreen",
  "appendEmbedParam",
];

export function mergeConfig(partial: Partial<HandheldConfig> | undefined): HandheldConfig {
  const o: HandheldConfig = { ...DEFAULT_CONFIG };
  if (!partial) return o;
  for (const k of CONFIG_KEYS) {
    if (partial[k] !== undefined) (o as Record<string, unknown>)[k] = partial[k];
  }
  return o;
}

export function resolveWebUrl(cfg: HandheldConfig): string {
  const primary = cfg.useDevUrl ? cfg.devUrl.trim() : cfg.productionUrl.trim();
  const base = primary || cfg.devUrl.trim() || cfg.productionUrl.trim();
  if (!base) return "about:blank";
  if (!cfg.appendEmbedParam) return base;
  try {
    const u = new URL(base);
    u.searchParams.set("embed", "handheld");
    return u.toString();
  } catch {
    return base;
  }
}
