#!/usr/bin/env bash
# MasonOS — full-screen installer for the Arch Linux ISO.
#
#   bash arch-install-gui.sh
#
# Walks you through the same things arch-install.sh asks on the command line —
# which disk, who you are, timezone, encryption, swap, GPU — with real menus,
# then runs the install behind a live log window. Like the ArchTitus installer:
# a dialog/ncurses interface, because a fresh Arch ISO has no desktop to draw a
# window on. Everything it collects becomes arch-install.sh flags; nothing here
# partitions anything itself.
#
# THIS ERASES THE DISK YOU PICK.
set -Eeuo pipefail

readonly SELF_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
readonly INSTALLER="$SELF_DIR/arch-install.sh"
readonly BACKTITLE="MasonOS · Arch Linux installer"

DIALOG=""
DISK=""
USERNAME_VALUE="mason"
HOSTNAME_VALUE="masonos"
PASSWORD_VALUE=""
TIMEZONE_VALUE=""
ENCRYPT=0
SWAP_VALUE="auto"
GPU_VALUE="auto"
INSTALL_MASONOS=1
LUKS_PASSWORD=""

die() { printf 'MasonOS: %s\n' "$*" >&2; exit 1; }

# clear(1) needs a TERM; a bare console or a weird caller can lack one.
cls() { clear 2>/dev/null || printf '\033[2J\033[H'; }

# ── the dialog front end ─────────────────────────────────────────────────────

pick_dialog() {
  if command -v dialog >/dev/null 2>&1; then DIALOG=dialog; return; fi
  if command -v whiptail >/dev/null 2>&1; then DIALOG=whiptail; return; fi
  if command -v pacman >/dev/null 2>&1 && [[ -d /run/archiso ]]; then
    printf ' · installing dialog (it is not on this ISO)\n'
    if pacman -Sy --noconfirm --needed dialog >/dev/null 2>&1; then DIALOG=dialog; return; fi
  fi
  die "no dialog or whiptail — run arch-install.sh instead (it asks in plain text)."
}

readonly UI_ERR="/tmp/masonos-gui-error.txt"

ui() { "$DIALOG" --backtitle "$BACKTITLE" --stdout "$@"; }

# The menus need a terminal, and a sane TERM. Both are forced here so that a
# dialog error is reported instead of just returning to a black screen.
gui_broken() {
  printf '\nMasonOS: the installer window could not start (dialog exit %s, TERM=%s).\n' \
    "$1" "${TERM:-unset}" >&2
  if [[ -s "$UI_ERR" ]]; then
    printf 'dialog said:\n' >&2
    sed 's/^/  /' "$UI_ERR" >&2
  fi
  printf 'Starting the plain-text installer instead.\n\n' >&2
  exec "$INSTALLER" --repo "$SELF_DIR"
}

# A cancel (Esc) is a real answer: stop cleanly instead of continuing empty.
# Never call this inside $(...): the exit would only leave the subshell and the
# caller would carry on with an empty value. Read UI_OUT after the call instead.
UI_OUT=""
ui_or_quit() {
  local out rc=0
  out="$(ui "$@" 2>"$UI_ERR")" || rc=$?
  if (( rc == 1 )); then
    cls
    printf 'MasonOS: cancelled — nothing was changed.\n'
    exit 1
  fi
  (( rc != 0 )) && gui_broken "$rc"
  UI_OUT="$out"
}

# ── screens ──────────────────────────────────────────────────────────────────

screen_welcome() {
  local rc=0
  ui --title "MasonOS" \
    --yesno "\n  MasonOS turns a fresh Arch Linux box into this desktop:\n\
  Mason's panels, launcher, terminal and files on KDE Plasma 6.\n\n\
  This installer will:\n\
    ·  erase one disk completely (no undo, no backup)\n\
    ·  install Arch Linux, Plasma 6, SDDM, PipeWire and the drivers\n\
    ·  set up Maz's user account and install MasonOS into it\n\n\
  Next: pick the disk.\n" 20 74 2>"$UI_ERR" || {
    rc=$?
    # 1 means the No/Quit button; anything else is the interface failing.
    if (( rc == 1 )); then cls; printf 'Nothing was changed.\n'; exit 0; fi
    gui_broken "$rc"
  }
}

live_medium_disk() {
  local source parent
  source="$(findmnt -no SOURCE /run/archiso/bootmnt 2>/dev/null || true)"
  [[ -n "$source" ]] || return 1
  parent="$(lsblk -no PKNAME "$source" 2>/dev/null | head -1 || true)"
  [[ -n "$parent" ]] && printf '/dev/%s' "$parent"
}

# NUL-separated "device", "size model" pairs: MODEL has spaces in it, so the
# columns cannot be split on whitespace.
disk_labels() {
  local skip dev type size model
  skip="$(live_medium_disk || true)"
  while read -r dev type; do
    [[ "$type" == "disk" ]] || continue
    [[ "$dev" == "$skip" ]] && continue
    size="$(lsblk -dno SIZE "$dev" 2>/dev/null | tr -d ' ')"
    model="$(lsblk -dno MODEL "$dev" 2>/dev/null | sed 's/[[:space:]]*$//')"
    printf '%s\0%s %s\0' "$dev" "${size:-?}" "${model:-unknown}"
  done < <(lsblk -dpno NAME,TYPE 2>/dev/null)
  return 0
}

screen_disk() {
  local -a labels=() list=()
  local first=1
  mapfile -d '' -t labels < <(disk_labels)

  if (( ${#labels[@]} == 0 )); then
    ui --title "No disks" --msgbox "\n  No writable disks were found. Are you in a VM with no disk attached?\n" 10 70
    die "no disks to install on."
  fi

  local i=0
  while (( i < ${#labels[@]} )); do
    if (( first )); then list+=("${labels[i]}" "${labels[i+1]}" on); first=0
    else list+=("${labels[i]}" "${labels[i+1]}" off); fi
    i=$(( i + 2 ))
  done

  ui_or_quit --title "Disk" --radiolist \
    "\n  Which disk should Arch Linux be installed on?\n\n  Everything on it is erased: partitions, files, other systems.\n" \
    20 78 8 "${list[@]}"
  DISK="$UI_OUT"
  [[ -n "$DISK" ]] || die "no disk chosen."
  [[ -b "$DISK" ]] || die "$DISK is not a block device."
}

screen_identity() {
  ui_or_quit --title "Account" --form \
    "\n  The account MasonOS uses. It gets sudo (wheel group).\n" \
    14 66 2 \
    "Hostname:" 1 2  "$HOSTNAME_VALUE" 1 16 30 32 \
    "Username:" 2 2  "$USERNAME_VALUE" 2 16 30 32
  { read -r HOSTNAME_VALUE; read -r USERNAME_VALUE; } <<< "$UI_OUT"
  [[ "$USERNAME_VALUE" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] \
    || die "invalid username: $USERNAME_VALUE (lowercase letters, digits, _ and -)"
  [[ "$HOSTNAME_VALUE" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]{0,62}$ ]] \
    || die "invalid hostname: $HOSTNAME_VALUE"

  local first second
  while true; do
    ui_or_quit --title "Password" --passwordbox "\n  Password for $USERNAME_VALUE:\n" 10 60
    first="$UI_OUT"
    ui_or_quit --title "Password" --passwordbox "\n  Same password again:\n" 10 60
    second="$UI_OUT"
    if [[ -z "$first" ]]; then
      ui --title "Password" --msgbox "\n  The password cannot be empty.\n" 8 60
      continue
    fi
    if [[ "$first" != "$second" ]]; then
      ui --title "Password" --msgbox "\n  Those did not match — try again.\n" 8 60
      continue
    fi
    PASSWORD_VALUE="$first"
    break
  done
}

screen_timezone() {
  local current
  current="$(readlink -f /etc/localtime 2>/dev/null | sed 's|.*/zoneinfo/||' || true)"
  [[ -n "$current" && -e "/usr/share/zoneinfo/$current" ]] || current="Europe/London"

  ui_or_quit --title "Timezone" --menu \
    "\n  Clock and time zone (currently $current):\n" 22 66 12 \
    "$current" "detected on this ISO" \
    Europe/London "UK" \
    Europe/Berlin "Central Europe" \
    Europe/Paris "France" \
    Europe/Madrid "Spain" \
    Europe/Rome "Italy" \
    Europe/Amsterdam "Netherlands" \
    Europe/Stockholm "Scandinavia" \
    America/New_York "US Eastern" \
    America/Chicago "US Central" \
    America/Denver "US Mountain" \
    America/Los_Angeles "US Pacific" \
    Asia/Tokyo "Japan" \
    Australia/Sydney "Australia" \
    UTC "UTC" \
    other "Type a zone (e.g. Europe/Dublin)"
  local choice="$UI_OUT"
  if [[ "$choice" == "other" ]]; then
    ui_or_quit --title "Timezone" --inputbox "\n  Zone name:\n" 10 60 "$current"
    choice="$UI_OUT"
  fi
  [[ -e "/usr/share/zoneinfo/$choice" ]] || die "unknown timezone: $choice"
  TIMEZONE_VALUE="$choice"
}

screen_options() {
  ui_or_quit --title "Options" --checklist \
    "\n  Space selects, Enter confirms.\n" 18 74 3 \
    encrypt "Encrypt the root filesystem (LUKS2 passphrase at every boot)" on \
    masonos "Install MasonOS desktop and applications (recommended)" on \
    swap "Create a swap partition" on
  local picks="${UI_OUT//\"/}"
  ENCRYPT=0; INSTALL_MASONOS=0
  local make_swap=0
  [[ " $picks " == *" encrypt "* ]] && ENCRYPT=1
  [[ " $picks " == *" masonos "* ]] && INSTALL_MASONOS=1
  [[ " $picks " == *" swap "* ]] && make_swap=1

  if (( make_swap )); then
    ui_or_quit --title "Swap" --inputbox \
      "\n  Swap size in GiB — 'auto' is half your RAM, capped at 8:\n" 10 62 "auto"
    SWAP_VALUE="$UI_OUT"
    [[ "$SWAP_VALUE" =~ ^(auto|[0-9]{1,3})$ ]] || die "swap size must be a number or auto."
  else
    SWAP_VALUE="0"
  fi

  ui_or_quit --title "Graphics" --menu \
    "\n  Driver set:\n" 16 66 6 \
    auto "Detect from the hardware (recommended)" \
    intel "Intel / Mesa" \
    amd "AMD / Mesa" \
    nvidia "NVIDIA proprietary driver, KMS on" \
    vm "Virtual machine (Mesa + virgl)"
  GPU_VALUE="$UI_OUT"

  if (( ENCRYPT )); then
    local first second
    while true; do
      ui_or_quit --title "Disk encryption" --passwordbox \
        "\n  LUKS2 passphrase (asked at every boot):\n" 10 66
      first="$UI_OUT"
      ui_or_quit --title "Disk encryption" --passwordbox \
        "\n  Same passphrase again:\n" 10 66
      second="$UI_OUT"
      if [[ -z "$first" ]]; then
        ui --title "Disk encryption" --msgbox "\n  The passphrase cannot be empty.\n" 8 64
        continue
      fi
      [[ "$first" == "$second" ]] && { LUKS_PASSWORD="$first"; break; }
      ui --title "Disk encryption" --msgbox "\n  Those did not match — try again.\n" 8 64
    done
  fi
}

build_args() {
  ARGS=( --disk "$DISK" --user "$USERNAME_VALUE" --hostname "$HOSTNAME_VALUE" )
  [[ -n "$TIMEZONE_VALUE" ]] && ARGS+=( --timezone "$TIMEZONE_VALUE" )
  ARGS+=( --password "$PASSWORD_VALUE" --yes --repo "$SELF_DIR" )
  ARGS+=( --gpu "$GPU_VALUE" --swap "$SWAP_VALUE" )
  (( ENCRYPT )) && ARGS+=( --encrypt --luks-password "$LUKS_PASSWORD" )
  (( INSTALL_MASONOS )) || ARGS+=( --no-masonos )
  return 0
}

summary_text() {
  local disk_size apps graphics
  disk_size="$(lsblk -dno SIZE "$DISK" 2>/dev/null | tr -d ' ' || echo '?')"
  (( INSTALL_MASONOS )) && apps="MasonOS (panels, launcher, terminal, files)" || apps="plain Plasma"
  graphics="$GPU_VALUE drivers"
  cat <<EOF

  Disk       $DISK ($disk_size) — everything on it is erased
  Account    $USERNAME_VALUE@$HOSTNAME_VALUE, with sudo
  Timezone   $TIMEZONE_VALUE
  Swap       $( [[ "$SWAP_VALUE" == "0" ]] && echo none || echo "$SWAP_VALUE GiB" )
  Root       ext4$( (( ENCRYPT )) && echo ", LUKS2 encrypted" )
  Graphics   $graphics
  Desktop    KDE Plasma 6, $(echo "$apps")
  Source     $SELF_DIR

  This runs arch-install.sh with exactly these choices and takes
  10–25 minutes on a normal connection.
EOF
}

screen_confirm() {
  ui --title "Confirm" --yes-label "Install" --no-label "Back to start" \
    --yesno "$(summary_text)" 20 76 || main
}

# ── running it ───────────────────────────────────────────────────────────────

run_install() {
  local -a cmd=( "$INSTALLER" "${ARGS[@]}" )

  if [[ "$DIALOG" == "dialog" ]]; then
    # Live window: the installer's own output streams into it, and the window
    # stays up afterwards so a failure can be read instead of scrolling away.
    "${cmd[@]}" 2>&1 | "$DIALOG" --backtitle "$BACKTITLE" --title "Installing" --programbox \
      "\n  Installing Arch Linux + MasonOS on $DISK.\n  This takes a while — the window follows the log.\n" \
      22 78 || install_failed
  else
    cls
    printf '\n  Running the installer — this takes a while.\n\n'
    "${cmd[@]}" || install_failed
  fi
}

install_failed() {
  local tail_text
  tail_text="$(tail -n 30 /tmp/masonos-arch-install.log 2>/dev/null || echo '(no log)')"
  ui --title "Install stopped" --msgbox \
    "  The installer did not finish. Full log: /tmp/masonos-arch-install.log\n\n\
$(printf '%s' "$tail_text" | tail -n 12 | cut -c1-100)" 24 100
  cls
  printf 'MasonOS: installer stopped — see /tmp/masonos-arch-install.log\n' >&2
  exit 1
}

screen_done() {
  if ui --title "Done" \
    --yesno "\n  Arch Linux + MasonOS is installed.\n\n  Reboot, then log in as $USERNAME_VALUE — MasonOS sets itself up on that first login.\n\n  Reboot now?\n" 16 70
  then
    cls
    reboot
  else
    cls
    printf 'Reboot when you are ready: reboot\n'
  fi
}

# ── main ─────────────────────────────────────────────────────────────────────

main() {
  [[ ${EUID} -eq 0 ]] || die "start it as root (on the Arch ISO you already are)."
  [[ -x "$INSTALLER" ]] || die "$INSTALLER is missing — run this from the MasonOS package."
  # Draw on the real terminal whatever the caller did with stdout, and make
  # sure TERM is something newt can use (a bare console often has none).
  if ! exec </dev/tty >/dev/tty 2>&1; then
    die "no terminal to draw in — run this on the ISO console, or use arch-install.sh"
  fi
  case "${TERM:-}" in ""|dumb|unknown) export TERM=linux ;; esac
  : > "$UI_ERR"
  pick_dialog
  screen_welcome
  screen_disk
  screen_identity
  screen_timezone
  screen_options
  screen_confirm
  build_args
  run_install
  screen_done
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  case "${1:-}" in
    -h|--help)
      cat <<'EOF'
usage: arch-install-gui.sh

Full-screen (dialog) installer for Arch Linux + MasonOS, run from the Arch ISO.
It asks for the disk, account, timezone, encryption, swap and graphics driver,
then runs arch-install.sh with those choices.

  --help    this text

Non-interactive install: use arch-install.sh directly, e.g.
  bash arch-install.sh --disk /dev/nvme0n1 --password '…' --yes
EOF
      exit 0
      ;;
    "")  main ;;
    *)   die "unknown option: $1 (try --help)" ;;
  esac
fi
