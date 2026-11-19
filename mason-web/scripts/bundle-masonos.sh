#!/usr/bin/env bash
# Pack the MasonOS desktop into mason-web/public/masonos so the site can host a
# one-line installer. Runs automatically before `npm run build` via prebuild.
#
#   MASONOS_PUBLIC_BASE=https://example.com/masonos bash scripts/bundle-masonos.sh
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
web_root="$(cd "$here/.." && pwd)"
repo_root="$(cd "$web_root/.." && pwd)"
source_dir="$repo_root/masonos"
out_dir="$web_root/public/masonos"
base_url="${MASONOS_PUBLIC_BASE:-https://sexwithmason.com/masonos}"

if [[ ! -d "$source_dir" ]]; then
  printf 'bundle-masonos: %s not found — skipping (mason-web can still build).\n' "$source_dir" >&2
  exit 0
fi

mkdir -p "$out_dir"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

tar -C "$repo_root" -czf "$out_dir/masonos.tar.gz" \
  --exclude='__pycache__' --exclude='*.pyc' --exclude='.git' masonos

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$out_dir/masonos.tar.gz" | awk '{print $1}' > "$out_dir/sha256.txt"
fi

# The release name comes from the installer itself, so there is one place to
# bump it and `masonosctl update` can compare the published script with its own.
masonos_version="$(sed -n 's/^MASONOS_VERSION="\([^"]*\)".*/\1/p' "$source_dir/install.sh" | head -1)"
[[ -n "$masonos_version" ]] || masonos_version="0.0.0"

sed -e "s|__BASE_URL__|$base_url|g" -e "s|__MASONOS_VERSION__|$masonos_version|g" \
  "$here/install-bootstrap.sh.in" > "$out_dir/install.sh"
chmod +x "$out_dir/install.sh"

preview="$source_dir/share/look-and-feel/com.mason.masonos/contents/previews/preview.png"
[[ -f "$preview" ]] && cp -f "$preview" "$out_dir/preview.png"

printf 'masonos %s %s\n' "$masonos_version" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$out_dir/version.txt"

printf 'bundle-masonos: %s (%s)\n' \
  "$out_dir/masonos.tar.gz" "$(du -h "$out_dir/masonos.tar.gz" | cut -f1)"
printf 'bundle-masonos: bootstrap points at %s\n' "$base_url"
