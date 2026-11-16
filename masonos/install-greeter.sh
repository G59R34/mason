#!/usr/bin/env bash
# Brand the login screen (Plasma Login Manager, plasmalogin).
#
# PLM deliberately does not accept custom QML themes: its greeter is the Breeze
# lock/login UI and takes its look from system-wide Plasma assets. So branding it
# means installing the artwork and palette into /usr/share and pointing
# /etc/plasmalogin.conf at the image. That is a root change, which is why it is
# a separate, opt-in step from install.sh.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
conf=/etc/plasmalogin.conf
image=/usr/share/wallpapers/masonos-lock.png

if [[ ${EUID} -ne 0 ]]; then
  printf 'MasonOS: run this with sudo — it writes to /usr/share and /etc.\n' >&2
  printf '         sudo %s\n' "$0" >&2
  exit 1
fi

if ! systemctl list-unit-files 2>/dev/null | grep -q '^plasmalogin\.service'; then
  printf 'MasonOS: Plasma Login Manager is not installed; nothing to brand.\n' >&2
  exit 1
fi

install -m 644 "$here/share/wallpapers/masonos-lock.png" "$image"
install -m 644 "$here/share/color-schemes/MasonOS.colors" /usr/share/color-schemes/MasonOS.colors
rm -rf /usr/share/plasma/look-and-feel/com.mason.masonos
cp -r "$here/share/look-and-feel/com.mason.masonos" /usr/share/plasma/look-and-feel/
printf ' · installed greeter artwork, palette and look-and-feel\n'

[[ -f "$conf.masonos.bak" ]] || cp "$conf" "$conf.masonos.bak"

python3 - "$conf" "$image" <<'PY'
import sys
from pathlib import Path

conf, image = Path(sys.argv[1]), sys.argv[2]
text = conf.read_text()
greeter = "[Greeter]\nWallpaperPluginId=org.kde.image\n"
nested = f"[Greeter][Wallpaper][org.kde.image][General]\nImage=file://{image}\n"

lines = text.splitlines()
out, skip = [], False
for line in lines:
    if line.strip().startswith("[Greeter"):
        skip = True
    elif line.startswith("[") and not line.startswith("[Greeter"):
        skip = False
    if not skip:
        out.append(line)
body = "\n".join(out).rstrip() + "\n\n" + greeter + "\n" + nested
conf.write_text(body)
print(f" · wrote {conf} (backup: {conf}.masonos.bak)")
PY

printf ' · the greeter picks this up on the next logout or reboot\n'
printf ' · undo: sudo cp %s.masonos.bak %s\n' "$conf" "$conf"
