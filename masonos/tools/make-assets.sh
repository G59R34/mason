#!/usr/bin/env bash
# Render MasonOS artwork from the mason-web palette. No source images needed.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/.." && pwd)"
wallpaper="${1:-$root/share/wallpapers/masonos.png}"
preview="$root/share/look-and-feel/com.mason.masonos/contents/previews/preview.png"

command -v magick >/dev/null || { echo "make-assets: ImageMagick (magick) is required" >&2; exit 1; }

bold="$(fc-match -f '%{file}' 'Noto Sans:style=Bold' 2>/dev/null || true)"
body="$(fc-match -f '%{file}' 'Noto Sans:style=Regular' 2>/dev/null || true)"
[[ -f "${bold:-}" ]] || bold="$(fc-match -f '%{file}' 'sans:style=Bold')"
[[ -f "${body:-}" ]] || body="$(fc-match -f '%{file}' 'sans')"

mkdir -p "$(dirname "$wallpaper")" "$(dirname "$preview")"

magick -size 2560x1664 radial-gradient:'#2f1c58'-'#040407' \
  \( -size 2560x1664 xc:none -fill 'rgba(139,92,246,0.32)' \
     -draw 'circle 1280,520 1280,150' -blur 0x260 \) \
  -compose over -composite \
  -gravity southwest \
  -font "$bold" -pointsize 82 -fill '#f4f4f5' -annotate +150+248 'MasonOS' \
  -font "$body" -pointsize 33 -fill '#c4b5fd' -annotate +154+184 'gnome-shaped, plasma-powered' \
  -font "$body" -pointsize 22 -fill '#71717a' -annotate +154+140 'mason-web // masonos 1.0' \
  -strip "$wallpaper"

magick "$wallpaper" -resize 800x520^ -gravity center -extent 800x520 -strip "$preview"

echo "$wallpaper"
echo "$preview"
