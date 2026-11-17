#!/usr/bin/env python3
"""MasonOS installer: Arch Linux through archinstall, then MasonOS inside it.

Everything that touches the disk — partitioning, LUKS, pacstrap, chroot, kernel
and bootloader — is archinstall's own code, the tool that already ships on the
Arch ISO and installs Arch thousands of times a day. This file only chooses the
options, then runs ~/mason/masonos/install.sh in the new system so the first
login lands in MasonOS.

  python3 arch-install.py --disk /dev/nvme0n1 --password '...' --yes
  arch-install.sh --help
"""

from __future__ import annotations

import argparse
import asyncio
import os
import shutil
import subprocess
import sys
from pathlib import Path

MOUNT = Path('/mnt')
LOG_FILE = Path('/tmp/masonos-arch-install.log')

PACKAGES = [
    'base-devel', 'sudo', 'nano', 'vim', 'git', 'curl', 'wget', 'less', 'man-db',
    'networkmanager', 'network-manager-applet',
    'plasma-meta', 'plasma-workspace', 'sddm', 'konsole', 'dolphin',
    'pipewire', 'pipewire-pulse', 'pipewire-alsa', 'wireplumber',
    'mesa', 'noto-fonts', 'noto-fonts-emoji', 'ttf-dejavu', 'ttf-jetbrains-mono',
    'python', 'pyside6', 'flatpak', 'xdg-utils', 'xdg-user-dirs',
    'glib2', 'libnotify', 'bluez', 'bluez-utils',
]

SERVICES = ['NetworkManager', 'sddm', 'bluetooth']
PLASMA_SHIM = '''#!/bin/sh
if [ "$1" = "--version" ]; then echo "plasmashell 6.0.0"; exit 0; fi
exec /usr/bin/plasmashell "$@"
'''


# ── talking to the person running it ─────────────────────────────────────────

def say(msg: str) -> None:
    print(f' · {msg}', flush=True)
    _log(msg)


def step(msg: str) -> None:
    print(f'\n==> {msg}', flush=True)
    _log(f'==> {msg}')


def warn(msg: str) -> None:
    print(f' ! {msg}', flush=True)
    _log(f'! {msg}')


def _log(msg: str) -> None:
    try:
        with LOG_FILE.open('a') as fh:
            fh.write(msg + '\n')
    except OSError:
        pass


def die(msg: str) -> None:
    print(f'\nMasonOS: {msg}', file=sys.stderr, flush=True)
    _log(f'FAILED: {msg}')
    sys.exit(1)


# ── checks ───────────────────────────────────────────────────────────────────

def check_machine(force_live: bool) -> None:
    step('Checking this machine')
    if os.geteuid() != 0:
        die('run this as root (on the Arch ISO you already are).')
    if os.uname().machine != 'x86_64':
        die('this installer builds x86_64 Arch. On %s, use Arch Linux ARM instead.'
            % os.uname().machine)
    if not force_live:
        if not Path('/etc/arch-release').exists():
            die('this is not Arch Linux. Boot the Arch ISO and run it there.')
        if not Path('/run/archiso').is_dir():
            die('not running from the Arch ISO (no /run/archiso).\n'
                'This partitions a whole disk, so it refuses to run from an installed\n'
                'system unless you pass --force-live.')
    try:
        import archinstall  # noqa: F401
    except ImportError:
        die('archinstall is not installed here. Boot the current Arch ISO — it ships\n'
            'with archinstall — or pacman -S archinstall.')


def check_network() -> None:
    step('Checking the network')
    if subprocess.call(['ping', '-c1', '-W3', '-q', 'archlinux.org'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
        say('network: online')
        return
    if subprocess.call(['ping', '-c1', '-W3', '-q', '1.1.1.1'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
        warn('network is up but DNS is not resolving — using 1.1.1.1 and 8.8.8.8')
        try:
            Path('/etc/resolv.conf').unlink()
        except OSError:
            pass
        Path('/etc/resolv.conf').write_text('nameserver 1.1.1.1\nnameserver 8.8.8.8\n')
        if subprocess.call(['ping', '-c1', '-W3', '-q', 'archlinux.org'],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
            say('network: online')
            return
    die('no internet access — the packages come from the network.\n'
        'Connect first (iwctl for Wi-Fi, systemctl start dhcpcd for wired), then rerun.')


def is_uefi() -> bool:
    return Path('/sys/firmware/efi').is_dir()


# ── the MasonOS source ───────────────────────────────────────────────────────

def find_repo(given: str) -> Path | None:
    candidates: list[Path] = []
    if given:
        p = Path(given)
        if (p / 'masonos' / 'install.sh').is_file():
            candidates.append(p / 'masonos')
        elif (p / 'install.sh').is_file():
            candidates.append(p)
        elif given.startswith(('http://', 'https://', 'git://')):
            say(f'cloning {given}')
            subprocess.run(['git', 'clone', '--depth', '1', given, '/tmp/mason-repo'],
                           check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            for sub in ('/tmp/mason-repo/masonos', '/tmp/mason-repo'):
                if (Path(sub) / 'install.sh').is_file():
                    candidates.append(Path(sub))
            if not candidates:
                die(f'could not clone {given}')
        else:
            die(f'--repo {given} is neither a MasonOS directory nor a git URL.')
    else:
        here = Path(__file__).resolve().parent
        for candidate in [here, here.parent,
                          Path.cwd() / 'masonos', Path.cwd(),
                          Path('/root/mason/masonos'), Path('/root/mason')]:
            if (candidate / 'install.sh').is_file() and (candidate / 'bin').is_dir():
                candidates.append(candidate)
        for parent in (Path('/run/media'), Path('/media'), Path('/mnt')):
            if parent.is_dir():
                for child in sorted(parent.glob('*/*/mason/masonos')):
                    candidates.append(child)
                for child in sorted(parent.glob('*/mason/masonos')):
                    candidates.append(child)

    for candidate in candidates:
        if (candidate / 'install.sh').is_file():
            say(f'MasonOS source: {candidate}')
            return candidate
    return None


# ── lay the disk out (archinstall's own suggestion, then our tweaks) ─────────

def build_layout(disk: str, swap_gib: int, encrypt: bool, luks_password: str):
    from archinstall.lib.disk.default_layouts import suggest_single_disk_layout
    from archinstall.lib.disk.device_handler import device_handler
    from archinstall.lib.models.device import (
        DiskEncryption, DiskLayoutConfiguration, DiskLayoutType, EncryptionType,
        FilesystemType, ModificationStatus, PartitionFlag, PartitionModification,
        PartitionType, Size, Unit,
    )
    from archinstall.lib.models.users import Password

    device = device_handler.get_device(Path(disk))
    if device is None:
        die(f'{disk} is not a disk archinstall can install on.')

    # Boot partition + root, sized and aligned by archinstall for this disk and
    # this firmware (UEFI gets an ESP, BIOS gets a BIOS boot partition).
    modification = asyncio.run(suggest_single_disk_layout(
        device, filesystem_type=FilesystemType('ext4'), separate_home=False))

    root = modification.get_root_partition()
    if root is None:
        die('archinstall did not propose a root partition.')

    sector = device.device_info.sector_size
    if swap_gib > 0:
        swap = Size(swap_gib, Unit.GiB, sector)
        if root.length <= swap + Size(4, Unit.GiB, sector):
            die(f'{disk} is too small for {swap_gib} GiB of swap plus a system.')
        root.length = root.length - swap
        modification.add_partition(PartitionModification(
            status=ModificationStatus.CREATE,
            type=PartitionType.PRIMARY,
            start=root.start + root.length,
            length=swap,
            fs_type=FilesystemType.LINUX_SWAP,
            flags=[PartitionFlag.SWAP],
        ))

    config = DiskLayoutConfiguration(
        config_type=DiskLayoutType.Default,
        device_modifications=[modification],
    )

    if encrypt:
        config.disk_encryption = DiskEncryption(
            encryption_type=EncryptionType.LUKS,
            encryption_password=Password(plaintext=luks_password),
            partitions=[root],
            hsm_device=None,
        )
    return device, config, root


def show_plan(device, config, root, args) -> None:
    sector = device.device_info.sector_size
    print(f'\n  This will ERASE {device.device_info.path} '
          f'({device.device_info.total_size.format_highest()})\n', flush=True)
    for modification in config.device_modifications:
        for part in modification.partitions:
            kind = part.fs_type.value if part.fs_type else 'no filesystem'
            mount = str(part.mountpoint) if part.mountpoint else ''
            print(f'    {part.start.format_highest():>8}  {kind:<12} {mount}', flush=True)
    print(f'\n    hostname  {args.hostname}', flush=True)
    print(f'    user      {args.user} (wheel, sudo)', flush=True)
    print(f'    timezone  {args.timezone}', flush=True)
    print(f'    desktop   KDE Plasma 6 (Wayland), SDDM, PipeWire', flush=True)
    print(f'    root      ext4{" on LUKS2" if args.encrypt else ""}', flush=True)
    print(f'    apps      {"MasonOS into ~/.local" if not args.no_masonos else "plain Plasma"}',
          flush=True)
    print(flush=True)


# ── the install itself ───────────────────────────────────────────────────────

def install_masonos(installer, user: str, repo: Path) -> None:
    step('Installing MasonOS for ' + user)
    target = MOUNT / 'home' / user / 'mason' / 'masonos'
    target.mkdir(parents=True, exist_ok=True)
    subprocess.run(['cp', '-a', f'{repo}/.', str(target)], check=True)

    # No session bus inside the chroot, so install.sh gets a stand-in for
    # plasmashell while it runs.
    shim = MOUNT / 'usr/local/bin/plasmashell'
    shim.parent.mkdir(parents=True, exist_ok=True)
    shim.write_text(PLASMA_SHIM)
    shim.chmod(0o755)
    try:
        installer.arch_chroot(f'chown -R {user}:{user} /home/{user}')
        installer.arch_chroot(
            'cd /home/%s/mason/masonos && QT_QPA_PLATFORM=offscreen ./install.sh --no-apply'
            % user,
            run_as=user,
            peek_output=True,
        )
    finally:
        shim.unlink(missing_ok=True)
    say('MasonOS is installed (it applies at the first login).')


def run_install(device, config, root, args, repo: Path | None) -> None:
    from archinstall.lib.disk.filesystem import FilesystemHandler
    from archinstall.lib.installer import Installer
    from archinstall.lib.models.bootloader import Bootloader
    from archinstall.lib.models.locale import LocaleConfiguration
    from archinstall.lib.models.users import Password, User

    step('Formatting and mounting')
    # Leftovers from an earlier attempt (a mounted /mnt, the swap partition on
    # this disk) otherwise make the format step refuse to touch the device.
    subprocess.call(['swapoff', '-a'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for extra in (['-R'], ['-R', '-l']):
        subprocess.call(['umount', *extra, str(MOUNT)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    FilesystemHandler(config).perform_filesystem_operations()

    packages = list(PACKAGES)
    if args.gpu == 'nvidia':
        packages += ['nvidia-open', 'nvidia-utils']
    elif args.gpu in ('intel', 'amd', 'vm'):
        packages += ['vulkan-intel' if args.gpu == 'intel' else 'vulkan-radeon']

    step('Installing Arch Linux with archinstall (this is the slow part)')
    with Installer(MOUNT, config, kernels=['linux'], silent=True) as installer:
        installer.mount_ordered_layout()
        installer.sanity_check(skip_ntp=True, skip_wkd=True)
        if config.disk_encryption is not None:
            installer.generate_key_files()

        installer.minimal_installation(
            optional_repositories=[],
            mkinitcpio=True,
            hostname=args.hostname,
            locale_config=LocaleConfiguration.default(),
        )
        installer.add_bootloader(Bootloader.Grub, False, False, None)
        installer.set_timezone(args.timezone)
        installer.activate_time_synchronization()
        installer.enable_service(SERVICES)
        installer.add_additional_packages(packages)
        installer.create_users(User(args.user, Password(plaintext=args.password), True))

        if root_user_password(args):
            installer.set_user_password(
                User('root', Password(plaintext=args.root_password), False))

        if repo is not None:
            install_masonos(installer, args.user, repo)

        installer.genfstab()

    step('Finishing up')
    subprocess.call(['sync'])


def root_user_password(args) -> str:
    return args.root_password or ''


# ── arguments ────────────────────────────────────────────────────────────────

def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog='arch-install.sh',
        description='Install Arch Linux + MasonOS on one disk, using archinstall.',
        add_help=True,
    )
    p.add_argument('--disk', help='the disk to erase and install on, e.g. /dev/nvme0n1')
    p.add_argument('--user', default='mason', help='the account to create (default: mason)')
    p.add_argument('--hostname', default='masonos', help='machine name (default: masonos)')
    p.add_argument('--timezone', default='UTC', help='e.g. Europe/London (default: UTC)')
    p.add_argument('--password', help="the account's password")
    p.add_argument('--root-password', help='set a password for root too (default: locked)')
    p.add_argument('--encrypt', action='store_true', help='LUKS2 on the root filesystem')
    p.add_argument('--luks-password', help='LUKS2 passphrase, so --encrypt never asks')
    p.add_argument('--swap', default='auto', help="swap size in GiB, or 'auto' (default)")
    p.add_argument('--no-swap', action='store_true', help='no swap partition')
    p.add_argument('--gpu', default='auto', choices=['auto', 'intel', 'amd', 'nvidia', 'vm'])
    p.add_argument('--repo', default='', help='the MasonOS checkout (path or git URL)')
    p.add_argument('--no-masonos', action='store_true', help='plain Arch + Plasma only')
    p.add_argument('--yes', '-y', action='store_true', help='skip the confirmation')
    p.add_argument('--force-live', action='store_true', help='run outside the Arch ISO')
    p.add_argument('--dry-run', action='store_true', help='print the plan, change nothing')
    args = p.parse_args(argv)

    if not args.disk:
        p.error('--disk is needed (which disk to erase?)')
    args.disk = os.path.realpath(args.disk)
    if not Path(args.disk).is_block_device():
        p.error(f'{args.disk} is not a block device')
    return args


def swap_gib(args) -> int:
    if args.no_swap:
        return 0
    if args.swap != 'auto':
        if not args.swap.isdigit():
            die('--swap needs a whole number of GiB (or auto).')
        return int(args.swap)
    ram_kb = 0
    for line in Path('/proc/meminfo').read_text().splitlines():
        if line.startswith('MemTotal:'):
            ram_kb = int(line.split()[1])
            break
    ram_gib = max(2, min(16, ram_kb // 1024 // 1024))
    gib = min(8, max(2, ram_gib // 2))
    say(f'swap: {gib} GiB (half of {ram_gib} GiB RAM, capped at 8)')
    return gib


def main(argv: list[str]) -> int:
    LOG_FILE.write_text('')
    args = parse_args(argv)

    print('MasonOS — Arch Linux installer (archinstall)')
    print(f'{os.popen("date -Is").read().strip()} · log: {LOG_FILE}')

    check_machine(args.force_live)
    check_network()

    if not args.password:
        if not sys.stdin.isatty():
            die('nothing to ask on. Pass --password (and --yes for an unattended run).')
        import getpass
        while True:
            first = getpass.getpass(f'  Password for {args.user}: ')
            second = getpass.getpass('  Same password again: ')
            if first and first == second:
                args.password = first
                break
            print('  Those did not match — try again.')
    if args.encrypt and not args.luks_password:
        if not sys.stdin.isatty():
            die('--encrypt needs --luks-password when nothing can be asked.')
        import getpass
        args.luks_password = getpass.getpass('  LUKS2 passphrase: ')
        if not args.luks_password:
            die('the LUKS passphrase cannot be empty.')
    if not args.encrypt:
        args.luks_password = ''

    gib = swap_gib(args)

    repo = None
    if not args.no_masonos:
        repo = find_repo(args.repo)
        if repo is None:
            warn('could not find the MasonOS checkout — installing plain Arch + Plasma.')
            args.no_masonos = True

    step('Choosing the disk')
    device, config, root = build_layout(args.disk, gib, args.encrypt, args.luks_password)
    show_plan(device, config, root, args)

    if args.dry_run:
        return 0

    if not args.yes:
        if not sys.stdin.isatty():
            die('nothing to ask on. Pass --yes to erase %s without asking.' % args.disk)
        answer = input(f'  Type the device name ({args.disk}) to erase it: ').strip()
        if answer != args.disk:
            die('not confirmed — nothing was changed.')

    run_install(device, config, root, args, repo)

    print(f'\nArch Linux + MasonOS is installed on {args.disk}.\n')
    print(f'  reboot now, remove the USB, boot the disk and log in as {args.user}.')
    print('  The first login applies MasonOS (panel, palette, apps, Super-key launcher).\n')
    print('  Afterwards, inside the session:')
    print("    masonosctl status     what is applied")
    print("    masonosctl off        hand the desktop back to plain Plasma")
    print("    masonosctl on         put MasonOS back")
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main(sys.argv[1:]))
    except KeyboardInterrupt:
        print('\nMasonOS: stopped. The disk may be half-written — rerun the installer.',
              file=sys.stderr)
        sys.exit(130)
