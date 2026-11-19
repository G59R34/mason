#!/usr/bin/env bash
# MasonOS replaces KDE Discover.
#
# Installed as ~/.local/bin/plasma-discover (ahead of /usr/bin on the session
# PATH), so launchers, the update notifier and anything else that runs
# `plasma-discover` open Mason's Software instead. If our app cannot run — no
# PySide6, no python3 — the real Discover is handed the request untouched.
set -u

app="${MASONOS_SOFTWARE_BIN:-$HOME/.local/bin/mason-software}"
real=""

for candidate in /usr/bin/plasma-discover /usr/bin/discover; do
  [[ -x "$candidate" ]] && { real="$candidate"; break; }
done

usable() {
  [[ -x "$app" ]] || return 1
  # install.sh records the Python that has PySide6 (the distro's, or the
  # virtualenv it installed); fall back to a system python3 if there is none.
  local py="${MASONOS_PYTHON:-$HOME/.local/share/masonos/pyside-python}"
  [[ -x "$py" ]] || py="$(command -v python3 || true)"
  [[ -n "$py" ]] || return 1
  "$py" -c "import PySide6" >/dev/null 2>&1 || return 1
}

if usable; then
  exec "$app"
fi

if [[ -n "$real" ]]; then
  exec "$real" "$@"
fi
echo "plasma-discover: Mason's Software is unavailable and Discover is not installed." >&2
exit 1
