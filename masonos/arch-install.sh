#!/usr/bin/env bash
# MasonOS — Arch Linux installer.
#
#   bash arch-install.sh --disk /dev/nvme0n1 --password '…' --yes
#   bash arch-install.sh --help
#
# The disk work — partitioning, LUKS, pacstrap, chroot, kernel, bootloader — is
# archinstall's own, the installer that already ships on the Arch ISO. The
# choices and the MasonOS step live in arch-install.py next to this file; this
# wrapper only finds a python that can import archinstall and hands over.
set -Eeuo pipefail

SELF="$(readlink -f "${BASH_SOURCE[0]}")"
HERE="$(dirname "$SELF")"
INSTALLER="$HERE/arch-install.py"

if [[ ! -f "$INSTALLER" ]]; then
  printf 'MasonOS: %s is missing — run this from the MasonOS package.\n' "$INSTALLER" >&2
  exit 1
fi

PYTHON=""
for candidate in python3 /usr/bin/python3 /usr/local/bin/python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PYTHON="$candidate"
    break
  fi
done
if [[ -z "$PYTHON" ]]; then
  printf 'MasonOS: python3 is missing — boot the current Arch ISO.\n' >&2
  exit 1
fi

exec "$PYTHON" "$INSTALLER" "$@"
