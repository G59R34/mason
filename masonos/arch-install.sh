#!/usr/bin/env bash
# MasonOS — Arch Linux installer.
#
# Run this from the Arch Linux ISO (the live "root@archiso" prompt). It takes a
# whole disk, installs Arch Linux with KDE Plasma 6, and then installs MasonOS
# into your user account so the first login is already MasonOS.
#
#   bash arch-install.sh                     guided: pick a disk, confirm, install
#   bash arch-install.sh --disk /dev/nvme0n1 --yes
#   bash arch-install.sh --disk /dev/sda --encrypt --user mason --yes
#   bash arch-install.sh --dry-run           show the plan and stop
#
# THIS ERASES THE DISK YOU CHOOSE. Everything on it is destroyed, without a
# backup, and there is no undo. Read the summary before you answer `yes`.
#
# What it builds:
#   GPT, 1 GiB EFI (or 1 MiB BIOS boot), swap (auto-sized), ext4 root
#   UEFI -> systemd-boot · BIOS -> GRUB · optional LUKS2 root encryption
#   Arch + Plasma 6 + SDDM + PipeWire + Konsole/Dolphin + PySide6 (MasonOS deps)
#   A wheel user with sudo, NetworkManager, and MasonOS installed into ~/.local
#
# After it finishes: `reboot`, log in — MasonOS transforms the session on the
# first login (autostart), and `masonosctl status`/`off` work from then on.
set -Eeuo pipefail

readonly PROGRAM="${0##*/}"
readonly MOUNT_POINT=/mnt
readonly LOG_FILE=/tmp/masonos-arch-install.log

DISK=""
USERNAME="mason"
HOSTNAME_VALUE="masonos"
TIMEZONE=""
PASSWORD=""
ROOT_PASSWORD=""
ENCRYPT=0
SWAP_SIZE="auto"
MAKE_SWAP=1
ASSUME_YES=0
DRY_RUN=0
INSTALL_MASONOS=1
FORCE_LIVE=0
GPU="auto"
REPO_SOURCE=""

# ── output ───────────────────────────────────────────────────────────────────

if [[ -t 1 ]]; then
  C_DIM=$'\033[2m'; C_B=$'\033[1m'; C_V=$'\033[35m'; C_R=$'\033[31m'
  C_Y=$'\033[33m'; C_G=$'\033[32m'; C_0=$'\033[0m'
else
  C_DIM=""; C_B=""; C_V=""; C_R=""; C_Y=""; C_G=""; C_0=""
fi

say()  { printf '%s·%s %s\n' "$C_V" "$C_0" "$*"; }
step() { printf '\n%s==>%s %s%s%s\n' "$C_V" "$C_0" "$C_B" "$*" "$C_0"; }
warn() { printf '%s!%s %s\n' "$C_Y" "$C_0" "$*" >&2; }
die()  { printf '%sx%s %s\n' "$C_R" "$C_0" "$*" >&2; exit 1; }
run()  { printf '%s  $%s %s\n' "$C_DIM" "$C_0" "$*"; "$@"; }

trap 'printf "\n%sx failed at line %s: %s%s\n" "$C_R" "$LINENO" "$BASH_COMMAND" "$C_0" >&2;
      printf "  log: %s\n" "$LOG_FILE" >&2' ERR

usage() {
  cat <<'EOF'
usage: arch-install.sh [options]

Run from the Arch Linux ISO. Installs Arch + KDE Plasma 6 + MasonOS on one disk.
EVERYTHING ON THE CHOSEN DISK IS ERASED.

  --disk DEVICE        target disk, e.g. /dev/nvme0n1 (asked if omitted)
  --user NAME          username to create (default: mason)
  --hostname NAME      hostname (default: masonos)
  --timezone ZONE      e.g. Europe/London (default: the live ISO's zone)
  --password PASS      password for the user (asked if omitted)
  --root-password PASS password for root (default: root stays locked, use sudo)
  --encrypt            encrypt the root filesystem with LUKS2 (asks a passphrase)
  --swap SIZE          swap partition size in GiB, or 0 for none (default: auto)
  --no-swap            same as --swap 0
  --gpu auto|intel|amd|nvidia|vm
                       driver set (default: auto, detected from the hardware)
  --repo PATH|URL      MasonOS checkout (default: found next to this script, in
                       the current directory, or on the mounted live medium)
  --no-masonos         install plain Arch + Plasma, skip MasonOS
  --yes                ask nothing, and do NOT ask you to retype the disk name
                       (the plan is still printed; --password is required with it)
  --force-live         run even when this does not look like the Arch ISO
  --dry-run            print the plan, change nothing
  -h, --help           this text
EOF
}

# ── arguments ────────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --disk)          DISK="${2:?--disk needs a device}"; shift 2 ;;
    --user)          USERNAME="${2:?--user needs a name}"; shift 2 ;;
    --hostname)      HOSTNAME_VALUE="${2:?--hostname needs a name}"; shift 2 ;;
    --timezone)      TIMEZONE="${2:?--timezone needs a zone}"; shift 2 ;;
    --password)      PASSWORD="${2:?--password needs a value}"; shift 2 ;;
    --root-password) ROOT_PASSWORD="${2:?--root-password needs a value}"; shift 2 ;;
    --encrypt)       ENCRYPT=1; shift ;;
    --swap)          SWAP_SIZE="${2:?--swap needs a size}"; MAKE_SWAP=1; shift 2 ;;
    --no-swap)       MAKE_SWAP=0; SWAP_SIZE="0"; shift ;;
    --gpu)           GPU="${2:?--gpu needs a value}"; shift 2 ;;
    --repo)          REPO_SOURCE="${2:?--repo needs a path or URL}"; shift 2 ;;
    --no-masonos)    INSTALL_MASONOS=0; shift ;;
    --yes|-y)        ASSUME_YES=1; shift ;;
    --force-live)    FORCE_LIVE=1; shift ;;
    --dry-run)       DRY_RUN=1; shift ;;
    -h|--help)       usage; exit 0 ;;
    *)               die "unknown option: $1 (try --help)" ;;
  esac
done

# ── preflight ────────────────────────────────────────────────────────────────

require_root() {
  [[ ${EUID} -eq 0 ]] || die "run this as root (on the Arch ISO you already are)."
}

require_x86_64() {
  local arch; arch="$(uname -m)"
  [[ "$arch" == "x86_64" ]] || die "this installer builds x86_64 Arch. On $arch,
use Arch Linux ARM (different distro, different bootloader) or archboot instead."
}

require_arch_live() {
  if [[ $FORCE_LIVE -eq 1 ]]; then
    warn "continuing on a system that is not the Arch ISO (--force-live)"
    return
  fi
  [[ -f /etc/arch-release ]] || die "this is not Arch Linux. Boot the Arch ISO and run it there."
  [[ -d /run/archiso ]] || die "not running from the Arch ISO (no /run/archiso).
This script partitions a whole disk, so it refuses to run from an installed
system unless you pass --force-live."
  for tool in pacstrap arch-chroot genfstab sgdisk; do
    command -v "$tool" >/dev/null || die "$tool is missing — boot the current Arch ISO."
  done
}

require_network() {
  if ping -c1 -W3 -q archlinux.org >/dev/null 2>&1; then
    say "network: online"
    return
  fi
  warn "no internet access — pacstrap cannot download packages."
  if [[ $ASSUME_YES -eq 1 ]]; then
    die "connect first: `iwctl` for Wi-Fi, or `systemctl start dhcpcd` / `nmcli`, then rerun."
  fi
  cat <<'EOF'

  Connect, then rerun:
    Wi-Fi   iwctl station wlan0 connect "SSID"
    Wired   systemctl start dhcpcd
    Both    ping -c1 archlinux.org

EOF
  die "stopping until the network is up."
}

require_uefi_or_bios() {
  if [[ -d /sys/firmware/efi ]]; then
    BOOT_MODE=uefi
    say "firmware: UEFI (systemd-boot)"
  else
    BOOT_MODE=bios
    say "firmware: BIOS/legacy (GRUB)"
    command -v grub-install >/dev/null || die "grub is missing from this ISO."
  fi
}

detect_gpu() {
  [[ "$GPU" == "auto" ]] || return 0
  if [[ -d /sys/module/nvidia ]] || lspci -nn 2>/dev/null | grep -qi '\[10de:'; then
    GPU=nvidia
  elif grep -qi 'GenuineIntel' /proc/cpuinfo; then
    GPU=intel
  else
    GPU=amd
  fi
  say "GPU: $GPU (driver set chosen from the hardware; --gpu overrides)"
}

# ── disk ─────────────────────────────────────────────────────────────────────

disk_is_live_medium() {
  local source
  source="$(findmnt -no SOURCE /run/archiso/bootmnt 2>/dev/null || true)"
  [[ -n "$source" ]] || return 1
  local parent
  parent="$(lsblk -no PKNAME "$source" 2>/dev/null | head -1 || true)"
  [[ -n "$parent" && "/dev/$parent" == "$DISK" ]]
}

list_disks() {
  printf '\n  %sDisks on this machine:%s\n' "$C_B" "$C_0"
  lsblk -dpno NAME,SIZE,MODEL 2>/dev/null | sed 's/^/    /'
  printf '\n'
}

choose_disk() {
  if [[ -z "$DISK" ]]; then
    list_disks
    read -r -p "  Target disk (whole disk, e.g. /dev/nvme0n1): " DISK
  fi
  [[ -n "$DISK" ]] || die "no disk given."
  [[ -b "$DISK" ]] || die "$DISK is not a block device."
  if disk_is_live_medium; then
    die "$DISK is the live USB you booted from. Pick the disk Arch should be installed on."
  fi

  local mounted
  mounted="$(lsblk -no MOUNTPOINT "$DISK" | grep -v '^$' || true)"
  if [[ -n "$mounted" ]]; then
    warn "partitions of $DISK are mounted:"
    printf '%s\n' "$mounted" | sed 's/^/    /' >&2
    if [[ $ASSUME_YES -eq 1 ]]; then
      die "unmount them first (umount -R each), then rerun."
    fi
    read -r -p "  Unmount them now? [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]] || die "nothing was changed."
    while read -r point; do
      [[ -n "$point" ]] && umount -R "$point" || true
    done <<< "$mounted"
  fi
}

partition_names() {
  # /dev/nvme0n1 -> /dev/nvme0n1p1, /dev/sda -> /dev/sda1
  local separator=""
  if [[ "$DISK" =~ [0-9]$ ]]; then separator="p"; fi
  BOOT_PART="${DISK}${separator}1"
  SWAP_PART="${DISK}${separator}2"
  ROOT_PART="${DISK}${separator}3"
  if [[ $BOOT_MODE == uefi ]]; then
    BOOT_PART="${DISK}${separator}1"
    SWAP_PART="${DISK}${separator}2"
    ROOT_PART="${DISK}${separator}3"
  fi
}

resolve_swap() {
  [[ $MAKE_SWAP -eq 1 ]] || { SWAP_GIB=0; return; }
  if [[ "$SWAP_SIZE" == "auto" ]]; then
    local ram_kb ram_gib
    ram_kb="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
    ram_gib=$(( ram_kb / 1024 / 1024 ))
    (( ram_gib < 2 )) && ram_gib=2 || true
    (( ram_gib > 16 )) && ram_gib=16 || true
    SWAP_GIB=$(( ram_gib / 2 < 2 ? 2 : ram_gib / 2 ))
    (( SWAP_GIB > 8 )) && SWAP_GIB=8 || true
    say "swap: ${SWAP_GIB} GiB (half of ${ram_gib} GiB RAM, capped at 8)"
  else
    [[ "$SWAP_SIZE" =~ ^[0-9]+$ ]] || die "--swap needs a whole number of GiB."
    SWAP_GIB="$SWAP_SIZE"
    if (( SWAP_GIB == 0 )); then MAKE_SWAP=0; fi
  fi
}

describe_plan() {
  local disk_size boot_kind swap_kind root_kind user_password apps_kind
  disk_size="$(lsblk -dno SIZE "$DISK" | tr -d ' ' || echo '?')"
  if [[ $BOOT_MODE == uefi ]]; then boot_kind="1 GiB EFI (vfat), systemd-boot"; else boot_kind="1 MiB BIOS boot, GRUB"; fi
  if [[ $MAKE_SWAP -eq 1 ]]; then swap_kind="${SWAP_GIB} GiB"; else swap_kind="none"; fi
  if [[ $ENCRYPT -eq 1 ]]; then root_kind="rest of the disk, ext4 on LUKS2"; else root_kind="rest of the disk, ext4"; fi
  if [[ -n "$PASSWORD" ]]; then user_password="password set"; else user_password="password asked below"; fi
  if [[ $INSTALL_MASONOS -eq 1 ]]; then apps_kind="MasonOS installed into ~/.local (applies at first login)"; else apps_kind="plain Plasma only (--no-masonos)"; fi

  printf '\n%s  This will ERASE %s (%s)%s\n' "$C_R$C_B" "$DISK" "$disk_size" "$C_0"
  cat <<EOF

    boot      ${BOOT_PART}    ${boot_kind}
    swap      ${SWAP_PART}    ${swap_kind}
    root      ${ROOT_PART}    ${root_kind}

    hostname  ${HOSTNAME_VALUE}
    user      ${USERNAME} (wheel, sudo, ${user_password})
    timezone  ${TIMEZONE:-from the live ISO}
    desktop   KDE Plasma 6 (Wayland), SDDM, PipeWire, Konsole, Dolphin
    apps      ${apps_kind}

EOF
}

confirm_wipe() {
  if [[ $DRY_RUN -eq 1 ]]; then return 0; fi
  if [[ $ASSUME_YES -eq 1 ]]; then
    warn "wiping $DISK (--yes)"
    return 0
  fi
  printf '  %sThere is no undo and no backup.%s\n' "$C_B" "$C_0"
  local answer
  read -r -p "  Type the device name ($DISK) to erase it: " answer
  [[ "$answer" == "$DISK" ]] || die "not confirmed — nothing was changed."
}

# ── MasonOS source ───────────────────────────────────────────────────────────

find_repo() {
  [[ $INSTALL_MASONOS -eq 1 ]] || return 0
  local candidate
  if [[ -n "$REPO_SOURCE" ]]; then
    if [[ -d "$REPO_SOURCE/masonos" ]]; then
      REPO_DIR="$(cd "$REPO_SOURCE/masonos" && pwd)"
    elif [[ -d "$REPO_SOURCE" && -f "$REPO_SOURCE/install.sh" ]]; then
      REPO_DIR="$(cd "$REPO_SOURCE" && pwd)"
    elif [[ "$REPO_SOURCE" =~ ^(https?|git):// ]]; then
      say "cloning $REPO_SOURCE"
      git clone --depth 1 "$REPO_SOURCE" /tmp/mason-repo >/dev/null 2>&1 \
        || die "could not clone $REPO_SOURCE"
      REPO_DIR="$(cd /tmp/mason-repo/masonos 2>/dev/null && pwd || cd /tmp/mason-repo && pwd)"
    else
      die "--repo $REPO_SOURCE is neither a MasonOS directory nor a git URL."
    fi
  else
    for candidate in \
      "$(dirname "$(readlink -f "$0")")/masonos" \
      "$(dirname "$(readlink -f "$0")")" \
      "$PWD/masonos" "$PWD" \
      /root/mason/masonos /root/mason \
      /run/media/*/*/mason/masonos /run/media/*/mason/masonos
    do
      if [[ -f "$candidate/install.sh" && -d "$candidate/bin" ]]; then
        REPO_DIR="$(cd "$candidate" && pwd)"; break
      fi
    done
  fi

  if [[ -z "${REPO_DIR:-}" ]]; then
    warn "could not find the MasonOS checkout."
    cat <<'EOF'

  Copy the mason repo onto the live medium (or a second USB), or pass:
    bash arch-install.sh --repo /run/media/$USER/MASON/mason
    bash arch-install.sh --repo https://example.com/mason.git

  Without it you still get Arch + Plasma; rerun `masonos/install.sh` later.
EOF
    if [[ $ASSUME_YES -eq 1 ]]; then
      INSTALL_MASONOS=0
    else
      read -r -p "  Continue without MasonOS? [y/N] " reply
      [[ "$reply" =~ ^[Yy]$ ]] || die "put the repo somewhere findable and rerun."
      INSTALL_MASONOS=0
    fi
    return 0
  fi
  say "MasonOS source: $REPO_DIR"
}

# ── install steps ────────────────────────────────────────────────────────────

wipe_and_partition() {
  step "Partitioning $DISK"
  run wipefs --all --force "$DISK"
  run sgdisk --zap-all "$DISK"
  if [[ $BOOT_MODE == uefi ]]; then
    run sgdisk --new=1:0:+1G --typecode=1:EF00 --change-name=1:BOOT "$DISK"
  else
    run sgdisk --new=1:0:+1M --typecode=1:EF02 --change-name=1:BIOSBOOT "$DISK"
  fi
  if [[ $MAKE_SWAP -eq 1 ]]; then
    run sgdisk --new=2:0:+${SWAP_GIB}G --typecode=2:8200 --change-name=2:SWAP "$DISK"
  else
    run sgdisk --new=2:0:+8M --typecode=2:8200 --change-name=2:SWAP "$DISK"
  fi
  run sgdisk --new=3:0:0 --typecode=3:8300 --change-name=3:ROOT "$DISK"
  run partprobe "$DISK"
  udevadm settle
}

format_and_mount() {
  step "Formatting and mounting"
  if [[ $BOOT_MODE == uefi ]]; then
    run mkfs.fat -F32 -n BOOT "$BOOT_PART"
  fi
  if [[ $MAKE_SWAP -eq 1 ]]; then
    run mkswap -L swap "$SWAP_PART"
  fi
  if [[ $ENCRYPT -eq 1 ]]; then
    say "LUKS2 passphrase for $ROOT_PART (asked once, used at every boot):"
    run cryptsetup luksFormat --type luks2 --pbkdf argon2id "$ROOT_PART"
    run cryptsetup open "$ROOT_PART" cryptroot
    ROOT_DEVICE=/dev/mapper/cryptroot
  else
    ROOT_DEVICE="$ROOT_PART"
  fi
  run mkfs.ext4 -L root "$ROOT_DEVICE"
  run mount "$ROOT_DEVICE" "$MOUNT_POINT"
  if [[ $BOOT_MODE == uefi ]]; then
    run mkdir -p "$MOUNT_POINT/boot"
    run mount "$BOOT_PART" "$MOUNT_POINT/boot"
  fi
  if [[ $MAKE_SWAP -eq 1 ]]; then
    run swapon "$SWAP_PART"
  fi
}

package_list() {
  PACKAGES=(
    base base-devel linux linux-firmware
    sudo nano vim git curl wget less man-db
    networkmanager network-manager-applet
    plasma-meta plasma-workspace sddm konsole dolphin
    pipewire pipewire-pulse pipewire-alsa wireplumber
    mesa noto-fonts noto-fonts-emoji ttf-dejavu ttf-jetbrains-mono
    python pyside6 flatpak xdg-utils xdg-user-dirs glib2 libnotify
    bluez bluez-utils
  )
  if grep -qi 'GenuineIntel' /proc/cpuinfo; then PACKAGES+=(intel-ucode); fi
  if grep -qi 'AuthenticAMD' /proc/cpuinfo; then PACKAGES+=(amd-ucode); fi
  case "$GPU" in
    nvidia) PACKAGES+=(nvidia nvidia-utils) ;;
    vm)     PACKAGES+=(mesa virglrenderer) ;;
  esac
  if [[ $ENCRYPT -eq 1 ]]; then PACKAGES+=(cryptsetup); fi
}

pacstrap_system() {
  step "Installing Arch Linux (this is the slow part)"
  package_list
  run pacstrap -K "$MOUNT_POINT" "${PACKAGES[@]}"
  run genfstab -U "$MOUNT_POINT"
  genfstab -U "$MOUNT_POINT" >> "$MOUNT_POINT/etc/fstab"
}

write_chroot_script() {
  local root_uuid luks_uuid
  root_uuid="$(blkid -s UUID -o value "$ROOT_DEVICE" || true)"
  [[ -n "$root_uuid" ]] || die "could not read the UUID of $ROOT_DEVICE"
  local loader_cmdline="root=UUID=${root_uuid} rw"
  if [[ $ENCRYPT -eq 1 ]]; then
    luks_uuid="$(blkid -s UUID -o value "$ROOT_PART" || true)"
    [[ -n "$luks_uuid" ]] || die "could not read the LUKS UUID of $ROOT_PART"
    loader_cmdline="cryptdevice=UUID=${luks_uuid}:cryptroot root=/dev/mapper/cryptroot rw"
  fi
  local hooks="base udev autodetect microcode modconf kms keyboard keymap consolefont block"
  if [[ $ENCRYPT -eq 1 ]]; then hooks+=" encrypt"; fi
  hooks+=" filesystems fsck"

  cat > "$MOUNT_POINT/root/masonos-arch-setup.sh" <<CHROOT
#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

ln -sf "/usr/share/zoneinfo/${TIMEZONE}" /etc/localtime
hwclock --systohc

sed -i 's/^#en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen
locale-gen
echo 'LANG=en_US.UTF-8' > /etc/locale.conf
echo 'KEYMAP=us' > /etc/vconsole.conf

printf '%s\n' "${HOSTNAME_VALUE}" > /etc/hostname
cat > /etc/hosts <<'HOSTS'
127.0.0.1   localhost
::1         localhost
127.0.1.1   ${HOSTNAME_VALUE}.localdomain ${HOSTNAME_VALUE}
HOSTS

# mkinitcpio
sed -i 's/^HOOKS=.*/HOOKS=(${hooks})/' /etc/mkinitcpio.conf
mkinitcpio -P

# sudo for the wheel group
echo '%wheel ALL=(ALL:ALL) ALL' > /etc/sudoers.d/10-wheel
chmod 440 /etc/sudoers.d/10-wheel

# user
if ! id -u "${USERNAME}" >/dev/null 2>&1; then
  useradd -m -G wheel -s /bin/bash "${USERNAME}"
fi
passwd -l root >/dev/null || true

# services
systemctl enable NetworkManager.service
systemctl enable sddm.service
systemctl enable systemd-timesyncd.service
systemctl enable fstrim.timer
systemctl enable bluetooth.service || true
systemctl set-default graphical.target

# NVIDIA: KMS at boot, so Wayland works
if [[ "${GPU}" == "nvidia" ]]; then
  mkdir -p /etc/modprobe.d
  printf 'options nvidia_drm modeset=1 fbdev=1\n' > /etc/modprobe.d/nvidia.conf
  sed -i 's/^HOOKS=.*/HOOKS=(base udev autodetect microcode modconf kms keyboard keymap consolefont block nvidia nvidia_modeset nvidia_uvm nvidia_drm filesystems fsck)/' /etc/mkinitcpio.conf
  mkinitcpio -P
fi
CHROOT

  if [[ $BOOT_MODE == uefi ]]; then
    cat >> "$MOUNT_POINT/root/masonos-arch-setup.sh" <<CHROOT

bootctl --esp-path=/boot install
cat > /boot/loader/loader.conf <<'LOADER'
default arch.conf
timeout 3
console-mode max
editor no
LOADER
mkdir -p /boot/loader/entries
cat > /boot/loader/entries/arch.conf <<ENTRY
title   Arch Linux (MasonOS)
linux   /vmlinuz-linux
initrd  /initramfs-linux.img
options ${loader_cmdline}
ENTRY
CHROOT
  else
    cat >> "$MOUNT_POINT/root/masonos-arch-setup.sh" <<CHROOT

pacman --noconfirm -S grub
grub-install --target=i386-pc --reinstall "$DISK"
sed -i 's/^GRUB_CMDLINE_LINUX=.*/GRUB_CMDLINE_LINUX="${loader_cmdline}"/' /etc/default/grub
sed -i 's/^#GRUB_DISABLE_OS_PROBER=.*/GRUB_DISABLE_OS_PROBER=true/' /etc/default/grub
grub-mkconfig -o /boot/grub/grub.cfg
CHROOT
  fi

  if [[ $ENCRYPT -eq 1 ]]; then
    cat >> "$MOUNT_POINT/root/masonos-arch-setup.sh" <<CHROOT

echo 'cryptroot UUID=$(blkid -s UUID -o value "$ROOT_PART") none luks,discard' >> /etc/crypttab
CHROOT
  fi

  chmod +x "$MOUNT_POINT/root/masonos-arch-setup.sh"
}

configure_system() {
  step "Configuring the new system"
  run arch-chroot "$MOUNT_POINT" bash /root/masonos-arch-setup.sh
  rm -f "$MOUNT_POINT/root/masonos-arch-setup.sh"

  if [[ -n "$PASSWORD" ]]; then
    printf '%s:%s\n' "$USERNAME" "$PASSWORD" | arch-chroot "$MOUNT_POINT" chpasswd
  fi
  if [[ -n "$ROOT_PASSWORD" ]]; then
    printf 'root:%s\n' "$ROOT_PASSWORD" | arch-chroot "$MOUNT_POINT" chpasswd
    if [[ $ENCRYPT -eq 0 ]]; then say "root password set (sudo still works for $USERNAME)"; fi
  fi
}

install_masonos() {
  [[ $INSTALL_MASONOS -eq 1 ]] || { say "skipping MasonOS (--no-masonos)"; return; }
  step "Installing MasonOS for $USERNAME"
  local target="$MOUNT_POINT/home/$USERNAME/mason"
  run mkdir -p "$target"
  # The checkout is copied in: ~/.local/bin symlinks point at it, so it stays.
  tar -C "$REPO_DIR" -cf - . | tar -C "$target" -xf -
  run chown -R "$USERNAME:$USERNAME" "$MOUNT_POINT/home/$USERNAME"

  # install.sh insists on a Plasma 6 version string; inside the chroot there is
  # no session bus for the real plasmashell to answer on, so /usr/local/bin gets
  # a stand-in for the duration of the install (removed right after).
  local shim="$MOUNT_POINT/usr/local/bin/plasmashell"
  mkdir -p "$MOUNT_POINT/usr/local/bin"
  cat > "$shim" <<'SH'
#!/bin/sh
if [ "$1" = "--version" ]; then echo "plasmashell 6.0.0"; exit 0; fi
exec /usr/bin/plasmashell "$@"
SH
  chmod 755 "$shim"

  say "running masonos/install.sh --no-apply as $USERNAME (first login applies it)"
  local status=0
  arch-chroot "$MOUNT_POINT" sudo -u "$USERNAME" -H env QT_QPA_PLATFORM=offscreen \
    bash -lc 'cd ~/mason/masonos && ./install.sh --no-apply' || status=$?
  rm -f "$shim"
  [[ $status -eq 0 ]] || die "MasonOS install failed inside the new system (see above). Arch itself is installed and boots."
}

finish() {
  step "Finishing up"
  sync
  if [[ $MAKE_SWAP -eq 1 ]]; then
    swapoff "$SWAP_PART" || true
  fi
  if mountpoint -q "$MOUNT_POINT/boot"; then umount "$MOUNT_POINT/boot"; fi
  umount -R "$MOUNT_POINT" || true
  [[ $ENCRYPT -eq 1 ]] && cryptsetup close cryptroot || true

  cat <<EOF

${C_G}Arch Linux + MasonOS is installed on ${DISK}.${C_0}

  reboot now, remove the USB, boot the disk and log in as ${USERNAME}.
  The first login applies MasonOS (panel, palette, apps, Super-key launcher).

  Afterwards, inside the session:
    masonosctl status     what is applied
    masonosctl off        hand the desktop back to plain Plasma
    masonosctl on         put MasonOS back
    Super                 Mason's Launcher
    masonosctl terminal   Mason's Terminal
EOF
}

# ── main ─────────────────────────────────────────────────────────────────────

main() {
  exec > >(tee -a "$LOG_FILE") 2>&1

  printf '%s\n' "${C_V}${C_B}MasonOS — Arch Linux installer${C_0}"
  printf '%s\n' "${C_DIM}$(date -Is) · log: $LOG_FILE${C_0}"

  require_root
  require_x86_64
  require_arch_live
  require_uefi_or_bios
  require_network
  choose_disk
  partition_names
  resolve_swap
  detect_gpu
  find_repo

  if [[ -z "$TIMEZONE" ]]; then
    if [[ -L /etc/localtime ]]; then
      TIMEZONE="$(readlink -f /etc/localtime | sed 's|.*/zoneinfo/||')"
    fi
    [[ -n "$TIMEZONE" ]] || TIMEZONE="Etc/UTC"
  fi
  [[ -e "/usr/share/zoneinfo/$TIMEZONE" ]] || die "unknown timezone: $TIMEZONE"

  if [[ -z "$PASSWORD" && $DRY_RUN -eq 0 && $ASSUME_YES -eq 0 ]]; then
    local first second
    while true; do
      read -r -s -p "  Password for $USERNAME: " first; printf '\n'
      read -r -s -p "  Repeat: " second; printf '\n'
      [[ -n "$first" ]] || { warn "password cannot be empty"; continue; }
      [[ "$first" == "$second" ]] && break
      warn "passwords do not match"
    done
    PASSWORD="$first"
  fi
  if [[ $DRY_RUN -eq 0 && -z "$PASSWORD" ]]; then
    die "no password for $USERNAME — pass --password, or run without --yes to be asked."
  fi

  describe_plan

  if [[ $DRY_RUN -eq 1 ]]; then
    printf '\n%s  dry run — nothing was changed.%s\n\n' "$C_Y" "$C_0"
    exit 0
  fi

  confirm_wipe

  wipe_and_partition
  format_and_mount
  pacstrap_system
  write_chroot_script
  configure_system
  install_masonos
  finish
}

main "$@"
