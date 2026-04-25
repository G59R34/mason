# Flatpak packaging (starter notes)

Mason Handheld is a standard Tauri 2 desktop app. To ship as Flatpak:

1. **Build the release binary** on Linux (or use a reproducible container):
   ```bash
   cd mason-handheld
   env -u CI npm run tauri build -- --bundles appimage
   ```
   Use the generated binary under `src-tauri/target/release/` or the AppImage as a reference for files to install.

2. **App ID** — align with `identifier` in `src-tauri/tauri.conf.json` (`com.mason.handheld`). Use the reverse-DNS form for Flatpak: `com.mason.MasonHandheld` (adjust to match your final ID).

3. **Typical Flatpak layout**
   - Install the binary to `/app/bin/mason-handheld`.
   - Install icons from `src-tauri/icons/` into `/app/share/icons/hicolor/...`.
   - Install a renamed `.desktop` file to `/app/share/applications/`.
   - Grant **network** permission (`--share=network`) so the embedded site can load.

4. **WebKit / GTK** — Tauri on Linux uses WebKitGTK. The Flatpak runtime must include compatible GTK/WebKit libraries (e.g. `org.gnome.Platform` + SDK, or `org.freedesktop.Platform` depending on your stack). Follow current Tauri Flatpak community examples for runtime versions.

5. **Steam** — Steam launches the Flatpak binary if the desktop file / launch command points at `flatpak run <app-id>` or a host wrapper script.

6. **Next steps** — Generate a full manifest with `flatpak-builder` once runtime requirements are pinned; this repo does not pin a specific GNOME/KDE runtime version (they change over time).

See also: [Tauri distribution](https://tauri.app/distribute/) and Flatpak application docs.
