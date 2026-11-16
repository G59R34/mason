#!/usr/bin/env bash
# MasonOS installer — everything lives in ~/.local, no root, and `masonosctl off`
# puts KDE Plasma back the way it was.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
data="${XDG_DATA_HOME:-$HOME/.local/share}"
config="${XDG_CONFIG_HOME:-$HOME/.config}"
state="${XDG_STATE_HOME:-$HOME/.local/state}"
bin="$HOME/.local/bin"
autostart=1
apply_now=1

for arg in "$@"; do
  case "$arg" in
    --no-autostart) autostart=0 ;;
    --no-apply) apply_now=0 ;;
    -h|--help)
      cat <<'EOF'
usage: install.sh [--no-autostart] [--no-apply]

Works on any KDE Plasma 6 desktop (Fedora, Arch, Debian/Ubuntu, openSUSE, …),
Wayland or X11, Intel/AMD/NVIDIA/Apple Silicon, notched or not.
Installs MasonOS into ~/.local (no root) and transforms the running session:
  · Mason Bot panel widget (Plasma 6 applet)
  · MasonOS plasma style, Look-and-Feel + splash, window decoration,
    icon overrides, GTK accent, KWin shortcuts, wallpaper, palette, fonts
  · ~/.local/bin/masonosctl
  · MasonOS Settings, Mason's Software (in place of Discover), Mason's Files
    and Mason's Launcher on the Super key
  · a "Transform MasonOS" icon on the Desktop and in the app grid
  · an autostart entry (--no-autostart to skip)

  --no-apply   install the files only, do not transform the session yet
EOF
      exit 0
      ;;
  esac
done

say() { printf ' · %s\n' "$*"; }
die() { printf 'MasonOS: %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

# ── Preflight: any distro, any desktop hardware, Plasma 6 ────────────────────
have plasmashell || die "KDE Plasma is required (plasmashell not found)."
plasma_version="$(plasmashell --version 2>/dev/null | grep -oE '[0-9]+(\.[0-9]+)*' | head -1 || true)"
case "${plasma_version%%.*}" in
  6) say "KDE Plasma ${plasma_version:-6} on $(uname -m)" ;;
  *) die "MasonOS needs KDE Plasma 6 — this session reports Plasma ${plasma_version:-unknown}." ;;
esac
if ! have kpackagetool6; then
  die "kpackagetool6 is missing (KDE Frameworks 6). Install kf6-kpackage on Fedora,
  kpackage6 on Arch, libkf6package-bin on Debian/Ubuntu, kpackage6 on openSUSE,
  then run this again."
fi
have busctl || have gdbus || say "warning: no busctl or gdbus — plasmashell cannot be scripted until one is installed"

# Respect a localised ~/Desktop, wherever this distro puts it.
desktop_dir="$(xdg-user-dir DESKTOP 2>/dev/null || true)"
[[ -n "$desktop_dir" && "$desktop_dir" != "$HOME" ]] || desktop_dir="$HOME/Desktop"

mkdir -p "$data/plasma/plasmoids" "$data/plasma/desktoptheme" "$data/plasma/look-and-feel" \
         "$data/aurorae/themes" "$data/color-schemes" "$data/wallpapers" \
         "$data/icons/hicolor/scalable/apps" "$data/applications" \
         "$config/masonos" "$bin" "$state/masonos" "$desktop_dir"

# 0. One-way upgrade from the old MasonDE layout ------------------------------
if [[ -f "$state/masonde/bot.pid" ]]; then
  old_pid="$(cat "$state/masonde/bot.pid" 2>/dev/null || true)"
  if [[ -n "${old_pid:-}" ]] && grep -qa "masonde-bot.py" "/proc/$old_pid/cmdline" 2>/dev/null; then
    kill -TERM "$old_pid" 2>/dev/null || true
  fi
fi
if kpackagetool6 --type Plasma/Applet --list 2>/dev/null | grep -qx "com.mason.masonde.bot"; then
  kpackagetool6 --type Plasma/Applet --remove com.mason.masonde.bot >/dev/null 2>&1 || true
  say "removed the old MasonDE widget"
fi
rm -f "$data/color-schemes/MasonDE.colors" "$data/wallpapers/masonde.png" \
      "$data/icons/hicolor/scalable/apps/masonde.svg" \
      "$data/applications/masonde-reload.desktop" \
      "$HOME/Desktop/MasonDE.desktop" "$HOME/Desktop/MasonOS.desktop" \
      "$bin/masondectl"
if [[ -d "$state/masonde" ]]; then
  [[ -f "$state/masonde/appletsrc.premasonde" && ! -f "$state/masonos/appletsrc.pre-masonos" ]] && \
    mv "$state/masonde/appletsrc.premasonde" "$state/masonos/appletsrc.pre-masonos"
  [[ -f "$state/masonde/state.json" && ! -f "$state/masonos/legacy-state.json" ]] && \
    mv "$state/masonde/state.json" "$state/masonos/legacy-state.json"
  rm -rf "$state/masonde"
  say "migrated MasonDE state to MasonOS"
fi
if [[ -d "$config/masonde" && ! -f "$config/masonos/bot.json" ]]; then
  [[ -f "$config/masonde/bot.json" ]] && mv "$config/masonde/bot.json" "$config/masonos/bot.json"
  rm -rf "$config/masonde"
  say "migrated the Mason Bot config"
fi

# 1. Packages ----------------------------------------------------------------
install_plasmoid() {
  local pkg="$1"
  if kpackagetool6 --type Plasma/Applet --upgrade "$pkg" >/dev/null 2>&1; then
    say "widget $(basename "$pkg") (updated)"
  elif kpackagetool6 --type Plasma/Applet --install "$pkg" >/dev/null 2>&1; then
    say "widget $(basename "$pkg") (installed)"
  else
    die "could not install $(basename "$pkg")"
  fi
}
install_plasmoid "$here/share/plasmoids/com.mason.masonos.bot"

if kpackagetool6 --type KWin/Script --upgrade "$here/share/kwin/masonos-shell" >/dev/null 2>&1; then
  say "kwin script (updated)"
else
  kpackagetool6 --type KWin/Script --install "$here/share/kwin/masonos-shell" >/dev/null 2>&1 \
    && say "kwin script (installed)" || say "kwin script skipped: this KWin has no script support"
fi

# 2. Themes ------------------------------------------------------------------
copy_pkg() {
  local src="$1" dest="$2"
  [[ -d "$src" ]] || return 0
  rm -rf "$dest"
  cp -r "$src" "$dest"
}
copy_pkg "$here/share/desktoptheme/com.mason.masonos" "$data/plasma/desktoptheme/com.mason.masonos"
copy_pkg "$here/share/look-and-feel/com.mason.masonos" "$data/plasma/look-and-feel/com.mason.masonos"
copy_pkg "$here/share/aurorae/themes/MasonOS" "$data/aurorae/themes/MasonOS"
copy_pkg "$here/share/icons/MasonOS" "$data/icons/MasonOS"
say "plasma style, look-and-feel, decoration, icon overrides"

install -m 644 "$here/share/color-schemes/MasonOS.colors" "$data/color-schemes/MasonOS.colors"
install -m 644 "$here/share/icons/masonos.svg" "$data/icons/hicolor/scalable/apps/masonos.svg"
mkdir -p "$config/gtk-3.0" "$config/gtk-4.0"
install -m 644 "$here/share/gtk/masonos.css" "$config/gtk-3.0/masonos.css"
install -m 644 "$here/share/gtk/masonos.css" "$config/gtk-4.0/masonos.css"
say "palette, mark, GTK accent"

# 3. Wallpaper + splash preview ---------------------------------------------
if [[ -f "$here/share/wallpapers/masonos.png" ]]; then
  install -m 644 "$here/share/wallpapers/masonos.png" "$data/wallpapers/masonos.png"
  say "wallpaper"
elif command -v magick >/dev/null; then
  "$here/tools/make-assets.sh" >/dev/null
  install -m 644 "$here/share/wallpapers/masonos.png" "$data/wallpapers/masonos.png"
  say "wallpaper (rendered with ImageMagick)"
fi

if [[ -f "$here/share/wallpapers/masonos-lock.png" ]]; then
  install -m 644 "$here/share/wallpapers/masonos-lock.png" "$data/wallpapers/masonos-lock.png"
  say "lock screen artwork"
fi

# 4. Fonts -------------------------------------------------------------------
if command -v curl >/dev/null && command -v fc-cache >/dev/null; then
  fontdir="$data/fonts"
  mkdir -p "$fontdir"
  fetch_font() {
    [[ -f "$fontdir/$2" ]] && return 0
    curl -fsSL --max-time 25 "$1" -o "$fontdir/$2" 2>/dev/null
  }
  got=0
  fetch_font "https://raw.githubusercontent.com/google/fonts/main/ofl/syne/Syne%5Bwght%5D.ttf" "Syne-Variable.ttf" && got=1
  fetch_font "https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf" "DMSans-Variable.ttf" && got=1
  if [[ "$got" == 1 ]]; then
    fc-cache -f "$fontdir" >/dev/null 2>&1 || true
    say "Syne + DM Sans installed"
  else
    say "fonts skipped (offline) — falling back to Noto Sans"
  fi
fi

# 5. masonosctl --------------------------------------------------------------
chmod +x "$here/bin/masonosctl" "$here/tools/make-assets.sh"
ln -sf "$here/bin/masonosctl" "$bin/masonosctl"
ln -sf "$here/bin/masonosctl" "$bin/masondectl"   # compatibility alias
say "masonosctl -> $bin/masonosctl"

# 5b. MasonOS Settings (needs PySide6; skipped cleanly when it is absent) ------
if have python3 && python3 -c "import PySide6" >/dev/null 2>&1; then
  chmod +x "$here/bin/masonos-settings"
  ln -sf "$here/bin/masonos-settings" "$bin/masonos-settings"
  sed -e "s|@MASONOSCTL@|$bin/masonosctl|g" -e "s|@ICON@|masonos|g" \
    "$here/share/masonos-settings.desktop.in" > "$data/applications/masonos-settings.desktop"
  chmod +x "$data/applications/masonos-settings.desktop"
  say "MasonOS Settings -> $bin/masonos-settings (app grid)"

  # Stand in for KDE System Settings: shadow its launcher entry and put a shim
  # ahead of /usr/bin, so both the app grid and the tray's Configure items open
  # MasonOS Settings. masonosctl off removes both again.
  sed -e "s|@MASONOSCTL@|$bin/masonosctl|g" \
    "$here/share/systemsettings.desktop.in" > "$data/applications/systemsettings.desktop"
  chmod +x "$data/applications/systemsettings.desktop"
  install -m 755 "$here/share/systemsettings-shim.sh" "$bin/systemsettings"
  say "System Settings -> MasonOS Settings (KDE panels inside)"
else
  say "MasonOS Settings skipped: PySide6 is missing (python3-pyside6 / python-pyside6 / pyside6)"
fi

# 5c. Mason's Software (Discover replacement; PySide6 again) ------------------
if have python3 && python3 -c "import PySide6" >/dev/null 2>&1; then
  chmod +x "$here/bin/mason-software"
  ln -sf "$here/bin/mason-software" "$bin/mason-software"
  sed -e "s|@MASONOSCTL@|$bin/masonosctl|g" \
    "$here/share/masons-software.desktop.in" > "$data/applications/masons-software.desktop"
  chmod +x "$data/applications/masons-software.desktop"
  say "Mason's Software -> $bin/mason-software (app grid)"
  if [[ -f /usr/share/applications/org.kde.discover.desktop ]]; then
    install -m 644 "$here/share/discover-shadow.desktop.in" \
      "$data/applications/org.kde.discover.desktop"
    install -m 755 "$here/share/plasma-discover-shim.sh" "$bin/plasma-discover"
    say "Discover hidden; plasma-discover -> Mason's Software"
  fi
else
  say "Mason's Software skipped: PySide6 is missing (python3-pyside6 / python-pyside6 / pyside6)"
fi

# 5d. Mason's Files ----------------------------------------------------------
if have python3 && python3 -c "import PySide6" >/dev/null 2>&1; then
  chmod +x "$here/bin/masons-files"
  ln -sf "$here/bin/masons-files" "$bin/masons-files"
  sed -e "s|@MASONOSCTL@|$bin/masonosctl|g" \
    "$here/share/masons-files.desktop.in" > "$data/applications/masons-files.desktop"
  chmod +x "$data/applications/masons-files.desktop"
  say "Mason's Files -> $bin/masons-files (app grid)"
else
  say "Mason's Files skipped: PySide6 is missing (python3-pyside6 / python-pyside6 / pyside6)"
fi

# 5e. Mason's Launcher (Super key) ------------------------------------------
if have python3 && python3 -c "import PySide6.QtDBus" >/dev/null 2>&1; then
  chmod +x "$here/bin/masons-launcher"
  ln -sf "$here/bin/masons-launcher" "$bin/masons-launcher"
  mkdir -p "$data/dbus-1/services"
  sed -e "s|@LAUNCHER@|$bin/masons-launcher|g" \
    "$here/share/org.masonos.Launcher.service.in" \
    > "$data/dbus-1/services/org.masonos.Launcher.service"
  say "Mason's Launcher -> Super key (D-Bus service installed)"
else
  say "Mason's Launcher skipped: PySide6 (with QtDBus) is missing"
fi

# 6. Desktop icon + app grid -------------------------------------------------
desktop_entry() {
  sed -e "s|@MASONOSCTL@|$bin/masonosctl|g" -e "s|@ICON@|masonos|g" "$here/share/masonos.desktop.in"
}
desktop_entry > "$desktop_dir/MasonOS.desktop"
chmod +x "$desktop_dir/MasonOS.desktop"
desktop_entry > "$data/applications/masonos-transform.desktop"
chmod +x "$data/applications/masonos-transform.desktop"
say "Desktop icon $desktop_dir/MasonOS.desktop"

# 7. Bot credentials (stdlib python3 only; skipped when there is none) ------
if have python3; then
python3 - "$here" <<'PY'
import json, os, sys
from pathlib import Path

here = Path(sys.argv[1])
dest = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / "masonos" / "bot.json"
if dest.exists():
    print(" · bot bridge config already present (~/.config/masonos/bot.json)")
    raise SystemExit(0)

found = {}
for env in (here.parent / "mason-web" / ".env", here.parent / "masoncord" / ".env"):
    if not env.exists():
        continue
    for line in env.read_text(errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip().strip('"').strip("'")
        if key in ("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY") and value and not value.lower().startswith(("your", "changeme", "<")):
            found.setdefault(key, value)
    if len(found) == 2:
        break

if len(found) == 2:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps({
        "projectUrl": found["VITE_SUPABASE_URL"],
        "anonKey": found["VITE_SUPABASE_ANON_KEY"],
        "function": "smooth-service",
    }, indent=2) + "\n")
    dest.chmod(0o600)
    print(" · Mason Bot credentials imported from the repo .env")
else:
    print(" · no Supabase credentials found — Mason Bot will say so until you fill ~/.config/masonos/bot.json")
PY
else
  say "python3 not found — Mason Bot config left unset"
fi

# 8. Carry the pre-MasonDE settings into the manifest ------------------------
if have python3; then
python3 - "$state" <<'PY'
import json, os, sys
from pathlib import Path

state_dir = Path(sys.argv[1]) / "masonos"
legacy = state_dir / "legacy-state.json"
manifest_path = state_dir / "manifest.json"
if not legacy.exists() or manifest_path.exists():
    raise SystemExit(0)
try:
    old = json.loads(legacy.read_text())
except ValueError:
    raise SystemExit(0)

settings = {"kdeglobals": {"General": {}}}
general = settings["kdeglobals"]["General"]
for key, legacy_key in (("ColorScheme", "colorScheme"), ("font", "font"), ("menuFont", "menuFont")):
    value = old.get(legacy_key)
    if value:
        general[key] = value

manifest = {"active": False, "settings": settings, "gtk": {}}
backup = state_dir / "appletsrc.pre-masonos"
if backup.exists():
    manifest["appletsrc"] = str(backup)
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
print(" · remembered the pre-MasonDE settings for a clean revert")
PY
fi

# 9. Autostart ---------------------------------------------------------------
if [[ "$autostart" == 1 ]]; then
  mkdir -p "$config/autostart"
  cat > "$config/autostart/masonos.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=MasonOS
Comment=Transform this Plasma session into MasonOS at login
Exec=$bin/masonosctl on --quiet
OnlyShowIn=KDE;
X-KDE-autostart-after=panel
EOF
  say "autostart at login (remove ~/.config/autostart/masonos.desktop to stop)"
fi

# 10. Transform --------------------------------------------------------------
if [[ "$apply_now" == 1 ]]; then
  "$bin/masonosctl" on || die "transform failed; run: masonosctl on"
fi

cat <<EOF

MasonOS is installed.

  masonosctl on        transform into MasonOS
  masonosctl off       put your Plasma setup back
  masonosctl reload    off + on (double-click the Desktop icon)
  masonosctl status    what is applied, and what would be restored

Mason Bot lives in the top bar; its bridge logs to ~/.cache/masonos/bot.log.
EOF
