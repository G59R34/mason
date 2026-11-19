#!/usr/bin/env bash
# MasonOS replaces KDE Dolphin.
#
# Installed as ~/.local/bin/dolphin (ahead of /usr/bin on the session PATH), so
# anything that runs `dolphin`, `dolphin --new-window ~/x` or opens a folder from
# a tool lands in Mason's Files. If our app cannot run — no PySide6, no python3 —
# the real Dolphin is handed the request untouched.
set -u

app="${MASONOS_FILES_BIN:-$HOME/.local/bin/masons-files}"
real=""

for candidate in /usr/bin/dolphin /usr/local/bin/dolphin; do
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

# Dolphin's own flags (--new-window, --split, --select …) have no equivalent;
# hand it the last argument that looks like a path, and otherwise just open.
if usable; then
  target=""
  for arg in "$@"; do
    case "$arg" in
      -*) continue ;;
      *) target="$arg" ;;
    esac
  done
  if [[ -n "$target" ]]; then
    exec "$app" "$target"
  fi
  exec "$app"
fi

if [[ -n "$real" ]]; then
  exec "$real" "$@"
fi
echo "dolphin: Mason's Files is unavailable and Dolphin is not installed." >&2
exit 1
