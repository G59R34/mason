#!/usr/bin/env bash
# MasonOS replaces KDE System Settings.
#
# Installed as ~/.local/bin/systemsettings (which precedes /usr/bin on the
# session PATH), so "System Settings" in the launcher, the tray's Configure menu
# and anything else that runs `systemsettings` lands in MasonOS Settings instead.
# Individual panel requests (`systemsettings kcm_x`) are forwarded to kcmshell6
# by the app, and every other option is handed straight to the real binary.
set -u

app="${MASONOS_SETTINGS_BIN:-$HOME/.local/bin/masonos-settings}"
real=/usr/bin/systemsettings

usable() {
  [[ -x "$app" ]] || return 1
  command -v python3 >/dev/null 2>&1 || return 1
  python3 -c "import PySide6" >/dev/null 2>&1 || return 1
}

if usable; then
  if [[ $# -eq 0 ]]; then
    exec "$app"
  fi
  case "$1" in
    kcm_*|--page) exec "$app" "$@" ;;
  esac
fi

if [[ -x "$real" ]]; then
  exec "$real" "$@"
fi
exec systemsettings "$@"
