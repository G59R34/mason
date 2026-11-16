#!/usr/bin/env bash
# Remove MasonOS: revert the session, then delete everything it installed.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
data="${XDG_DATA_HOME:-$HOME/.local/share}"
config="${XDG_CONFIG_HOME:-$HOME/.config}"
state="${XDG_STATE_HOME:-$HOME/.local/state}"

say() { printf ' · %s\n' "$*"; }

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
      "$HOME/Desktop/MasonOS.desktop" \
      "$config/autostart/masonos.desktop" \
      "$config/gtk-3.0/masonos.css" \
      "$config/gtk-4.0/masonos.css" \
      "$HOME/.local/bin/masonosctl" \
      "$HOME/.local/bin/masondectl"
say "files removed"

if [[ -f "$config/masonos/bot.json" ]]; then
  echo " · kept $config/masonos/bot.json (delete it if you want the credentials gone)"
fi

echo "MasonOS uninstalled. Window decorations and colours are back to your pre-MasonOS setup."
