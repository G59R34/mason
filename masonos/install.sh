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

Installs MasonOS into ~/.local (no root) and transforms the running session:
  · Mason Bot panel widget (Plasma 6 applet)
  · MasonOS plasma style, Look-and-Feel + splash, window decoration,
    icon overrides, GTK accent, KWin shortcuts, wallpaper, palette, fonts
  · ~/.local/bin/masonosctl
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

command -v plasmashell >/dev/null || die "KDE Plasma 6 is required (plasmashell not found)."
command -v kpackagetool6 >/dev/null || die "KDE Plasma 6 is required (kpackagetool6 not found)."

mkdir -p "$data/plasma/plasmoids" "$data/plasma/desktoptheme" "$data/plasma/look-and-feel" \
         "$data/aurorae/themes" "$data/color-schemes" "$data/wallpapers" \
         "$data/icons/hicolor/scalable/apps" "$data/applications" \
         "$config/masonos" "$bin" "$state/masonos" "$HOME/Desktop"

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
      "$HOME/Desktop/MasonDE.desktop" \
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

# 5b. MasonOS Settings -------------------------------------------------------
chmod +x "$here/bin/masonos-settings"
ln -sf "$here/bin/masonos-settings" "$bin/masonos-settings"
sed -e "s|@MASONOSCTL@|$bin/masonosctl|g" -e "s|@ICON@|masonos|g" \
  "$here/share/masonos-settings.desktop.in" > "$data/applications/masonos-settings.desktop"
chmod +x "$data/applications/masonos-settings.desktop"
say "MasonOS Settings -> $bin/masonos-settings (app grid)"

# 6. Desktop icon + app grid -------------------------------------------------
desktop_entry() {
  sed -e "s|@MASONOSCTL@|$bin/masonosctl|g" -e "s|@ICON@|masonos|g" "$here/share/masonos.desktop.in"
}
desktop_entry > "$HOME/Desktop/MasonOS.desktop"
chmod +x "$HOME/Desktop/MasonOS.desktop"
desktop_entry > "$data/applications/masonos-transform.desktop"
chmod +x "$data/applications/masonos-transform.desktop"
say "Desktop icon ~/Desktop/MasonOS.desktop"

# 7. Bot credentials ---------------------------------------------------------
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

# 8. Carry the pre-MasonDE settings into the manifest ------------------------
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
