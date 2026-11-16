#!/usr/bin/env bash
# Remove MasonOS: revert the session, then delete everything it installed.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bin="$HOME/.local/bin"
data="${XDG_DATA_HOME:-$HOME/.local/share}"
config="${XDG_CONFIG_HOME:-$HOME/.config}"
state="${XDG_STATE_HOME:-$HOME/.local/state}"

say() { printf ' · %s\n' "$*"; }

desktop_dir="$(xdg-user-dir DESKTOP 2>/dev/null || true)"
[[ -n "$desktop_dir" && "$desktop_dir" != "$HOME" ]] || desktop_dir="$HOME/Desktop"

if [[ -x "$here/bin/masonosctl" ]]; then
  "$here/bin/masonosctl" off --quiet || true
  say "reverted the session"
fi

if command -v kpackagetool6 >/dev/null; then
  kpackagetool6 --type Plasma/Applet --remove com.mason.masonos.bot >/dev/null 2>&1 || true
  kpackagetool6 --type KWin/Script --remove masonos-shell >/dev/null 2>&1 || true
  say "widget and KWin script removed"
fi

rm -rf "$data/plasma/desktoptheme/com.mason.masonos" \
       "$data/plasma/look-and-feel/com.mason.masonos" \
       "$data/aurorae/themes/MasonOS" \
       "$data/icons/MasonOS" \
       "$state/masonos"
rm -f "$data/color-schemes/MasonOS.colors" \
      "$data/wallpapers/masonos.png" \
      "$data/icons/hicolor/scalable/apps/masonos.svg" \
      "$data/applications/masonos-transform.desktop" \
      "$data/applications/masonos-settings.desktop" \
      "$data/applications/systemsettings.desktop" \
      "$data/applications/masons-software.desktop" \
      "$data/applications/masons-files.desktop" \
      "$data/applications/masons-terminal.desktop" \
      "$data/applications/org.kde.discover.desktop" \
      "$data/applications/org.kde.dolphin.desktop" \
      "$bin/systemsettings" \
      "$bin/plasma-discover" \
      "$bin/dolphin" \
      "$data/dbus-1/services/org.masonos.Launcher.service" \
      "$HOME/.local/bin/mason-software" \
      "$HOME/.local/bin/masons-files" \
      "$HOME/.local/bin/masons-launcher" \
      "$HOME/.local/bin/masons-terminal" \
      "$desktop_dir/MasonOS.desktop" \
      "$config/autostart/masonos.desktop" \
      "$config/gtk-3.0/masonos.css" \
      "$config/gtk-4.0/masonos.css" \
      "$HOME/.local/bin/masonosctl" \
      "$HOME/.local/bin/masonos-settings" \
      "$HOME/.local/bin/masondectl"
say "files removed"

if [[ -f "$config/masonos/bot.json" ]]; then
  echo " · kept $config/masonos/bot.json (delete it if you want the credentials gone)"
fi

echo "MasonOS uninstalled. Window decorations and colours are back to your pre-MasonOS setup."
