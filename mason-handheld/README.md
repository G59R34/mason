# Mason Handheld

Production-oriented **Tauri 2 + React + TypeScript + Tailwind** shell for **[mason-web](../mason-web/)** on Linux handhelds (Bazzite, Steam Deck–class devices). It is **not** a bare browser window: it adds a handheld UI (loading, offline/error states, settings, controller-friendly focus, persistent URL config) around an embedded webview (`iframe`).

## Features

- Fullscreen-friendly window (default **1600×900**, resizable, min size for small panels)
- Embedded **mason-web** via configurable **production** and **dev** URLs
- **Loading** overlay, **offline** screen, **load timeout** → error screen with retry
- **Settings** with large touch targets; config persisted with **`tauri-plugin-store`** (app data dir)
- **Gamepad** (shell only): move focus, **A** confirm, **B** back (settings); keyboard arrows / Enter / Esc where safe
- **Top bar** optional; when hidden, a **Menu** FAB still opens Settings
- **Steam**-friendly: launch binary or desktop entry; optional start fullscreen
- **`.desktop`** file template under `packaging/`
- **Flatpak** starter notes under `packaging/flatpak/notes.md`

## Prerequisites

- **Rust** (stable), **Node** 20+
- Linux: WebKitGTK / GTK deps per [Tauri Linux setup](https://tauri.app/start/prerequisites/)

## Development

```bash
cd mason-handheld
npm install
npm run tauri dev
```

The Vite dev server runs on **port 1420** (Tauri default). Run **mason-web** separately, e.g. `npm run dev` in `mason-web` on **5173**, then in Mason Handheld Settings set **Dev URL** to `http://127.0.0.1:5173` and enable **Use dev URL**.

> **CI and `tauri build`:** If `CI=1` is set in the environment, the Tauri CLI may treat it incorrectly on some versions. Use `env -u CI npm run tauri build` for release builds.

## Production build

```bash
cd mason-handheld
npm run build
env -u CI npm run tauri build
```

Artifacts appear under `src-tauri/target/release/` and `src-tauri/target/release/bundle/` (format depends on OS: `.deb`, `.AppImage`, etc., on Linux).

## Configuration (persistent)

Stored in the app data directory as **`mason-handheld.json`** (via plugin store):

| Field | Purpose |
|--------|---------|
| `productionUrl` | Deployed mason-web HTTPS URL |
| `devUrl` | Local dev server (default `http://127.0.0.1:5173`) |
| `useDevUrl` | Toggle dev vs production |
| `loadTimeoutMs` | Iframe load timeout before error UI |
| `startFullscreen` | Request fullscreen on startup |
| `appendEmbedParam` | Append `?embed=handheld` so mason-web loads handheld/TV-optimized CSS |

## Steam (Non-Steam game)

1. Build or install Mason Handheld so `mason-handheld` is on `PATH`, or note the full path to the binary from `src-tauri/target/release/`.
2. Steam → **Games** → **Add a Non-Steam Game** → choose the binary or a small wrapper script.
3. **Launch options** (optional): none required; use in-app **Start fullscreen** for Game Mode.
4. **Controller**: Steam Input can remap to mouse/keyboard; the shell uses the browser **Gamepad API** for focus on **shell** controls only. Inside mason-web, behave like a normal browser.

## Linux desktop entry

Copy `packaging/mason-handheld.desktop` to `~/.local/share/applications/` (or system path), set `Exec=` to the real binary path, and install an icon named `mason-handheld` under your icon theme (or point `Icon=` to a full path).

## Project layout

```
mason-handheld/
├── src/                 # React + Tailwind shell
│   ├── components/      # ImmersiveShell, WebLayer, ControlDock, screens, UI
│   ├── hooks/           # Config, gamepad, online, focus
│   └── lib/             # Defaults + URL resolution
├── src-tauri/           # Tauri Rust project
├── packaging/           # .desktop + Flatpak notes
└── README.md
```

## Expanding later

- Add a **Rust command** to read GPU or battery and show a tiny status strip (optional).
- **Deep links**: register a custom URL scheme in Tauri and handle `open-url` events.
- **Split** webview: Tauri’s in-window navigation API is a larger change; the iframe keeps mason-web isolated and simple.

## License

Same as the parent repository unless specified otherwise.
