# MasonOS

A desktop identity for **KDE Plasma 6** — any distro, any GPU, any panel. Plasma
becomes a GNOME-shaped shell called **MasonOS**, styled from `mason-web`, with
Mason Bot in the top bar.

It is built and tested on Fedora Asahi Remix 45 (M2 MacBook Air), but nothing in
it is Asahi-specific: the distro, the GPU, the session type and the notch are all
detected at runtime, and each feature steps aside cleanly when its hardware or
tool is missing (see [Runs on](#runs-on)).

```
Fedora · Arch · Debian/Ubuntu · openSUSE · Bazzite · Nobara · anything with Plasma 6
Intel · AMD · NVIDIA · Apple Silicon
Wayland or X11 · notched or not
```

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◈            (notch)              MB Mason Bot  ⌄ ⌄ ⏻  Wed 20:41    │
└──────────────────────────────────────────────────────────────────────┘
                     ▢   ▢   ▢   ▢   ▢          ← dock
```

On a notched panel the bar leaves its centre empty, because that is where the
notch sits: launcher on the left, bot + tray + clock on the right.

## Runs on

| | Requirement |
|---|---|
| **Desktop** | KDE Plasma 6 (6.0+; built on 6.8). Plasma 5 is refused with a clear message. |
| **Distro** | Any that ships Plasma 6 — Fedora/Kinoite, Arch, Debian/Ubuntu, openSUSE, Bazzite, Nobara, NixOS… Nothing distro-specific is used. |
| **Session** | Wayland or X11. Fractional scaling is applied on Wayland only; on X11 the scale is left as you set it. |
| **Hardware** | Intel, AMD, NVIDIA and Apple Silicon. The notch is read from Asahi's devicetree; without one the bar uses the centred-clock layout. |
| **Tools** | `plasmashell` + `kpackagetool6` (Frameworks 6) are required. `busctl` **or** `gdbus` for scripting, `kscreen-doctor` for display checks, `kwriteconfig6`/`kreadconfig6` for settings, `python3` for the bot bridge. Each one only disables its own feature when missing. |
| **Python** | `python3`. **PySide6** — the Qt binding every MasonOS app is written in — is installed by `install.sh` itself: if the distro's Python does not already have it, it is fetched into `~/.local/share/masonos/venv` with pip, so no root password and no `apt`/`dnf` step is needed. |
| **Optional** | `magick` to re-render artwork, `curl` to fetch fonts and PySide6, `notify-send` for toasts. |

Missing pieces are reported, never fatal: no `kscreen-doctor` means no display
check, no `python3` (and no way to fetch PySide6) means no MasonOS apps, no notch
means the centred clock.

```bash
masonosctl status         # session, Plasma version, MasonOS version, what is applied
masonosctl check-update   # is the published MasonOS newer than this one?
masonosctl update         # download the published installer and run it
```

## Install it

```bash
cd masonos
./install.sh                 # installs + transforms immediately
./install.sh --no-apply      # install the files, transform later
```

Or straight from the site:

```bash
curl -fsSL https://sexwithmason.com/masonos/install.sh | bash
```

On the **Arch Linux ISO** that same line is the whole install: there is no desktop
to theme yet, so it runs `arch-install.sh` instead (see below). Arguments go
through, so `| bash -s -- --disk /dev/nvme0n1 --yes --password …` works there too.

Run it as yourself, **not** with `sudo`: the installer refuses root, because
everything belongs to your account and `/root/.local` is invisible to Plasma.

Everything lands in `~/.local`; nothing needs root — including PySide6, which the
installer fetches into `~/.local/share/masonos/venv` when the system Python does
not have it (it uses `pip --user` instead if a virtualenv cannot be made).
`install.sh` checks the Plasma version and dependencies up front, and also
migrates a pre-rename MasonDE install (removes the old widget, moves state and
bot config, remembers your original settings).

## Updates

`install.sh` carries the release name in one line — `MASONOS_VERSION="1.0.0"` — and
writes it to `~/.local/state/masonos/version` when it installs. Bump that line for
a release; `bundle-masonos.sh` copies it into the published
`https://sexwithmason.com/masonos/install.sh`, so the script on the site always
names its own version.

Mason Bot checks that published script every 30 minutes through the local bridge
(the bridge caches the answer for six hours, so it is one small GET):

* newer version published → **“MasonOS is out of date!”** pops out of the Mason
  Bot button, with the installed and published versions and an **Update** button;
  a violet dot stays on the panel pill until it is updated or dismissed with
  **Later**;
* **Update** asks the bridge to run `masonosctl update` detached — it downloads
  that same published installer and runs it, so an update is exactly a fresh
  install, and the bar restarts on the new release. It logs to
  `~/.cache/masonos/update.log`;
* offline, or the site is down, nothing happens: the last known answer is kept
  and the card stays quiet.

The same two steps are available by hand:

```bash
masonosctl check-update           # "MasonOS 1.2.0 is published; this install is 1.0.0."
masonosctl check-update --json    # one line, for scripts
masonosctl update                 # install it
```

## Install Arch from scratch

`arch-install.sh` takes a blank machine to a MasonOS desktop in one run. Boot the
Arch Linux ISO, get the network up, and run it — it partitions the disk, installs
Arch with Plasma 6, and installs MasonOS into your account so the first login is
already MasonOS.

```bash
# on the Arch ISO (root@archiso)
iwctl station wlan0 connect "My Wi-Fi"      # or: systemctl start dhcpcd

# the script needs the mason repo with it: mounted USB, or a clone
bash /run/media/$USER/MASON/mason/masonos/arch-install.sh --repo /run/media/$USER/MASON/mason
```

It asks which disk to erase, prints the plan, and only then touches anything.

| | |
|---|---|
| **Disk** | GPT: 1 GiB EFI (UEFI) or 1 MiB BIOS boot, a swap partition sized to half your RAM capped at 8 GiB, ext4 root on the rest |
| **Boot** | systemd-boot on UEFI, GRUB on legacy BIOS; optional LUKS2-encrypted root (`--encrypt`) |
| **System** | `linux` + firmware + microcode for your CPU, NetworkManager, PipeWire, SDDM, Plasma 6 (Wayland), Konsole, Dolphin, Mesa (or `nvidia` with KMS, `--gpu`) |
| **For MasonOS** | python, **PySide6**, glib2/`gio`, `xdg-utils`, `kwriteconfig6`/`kpackagetool6` (from Plasma), Noto + JetBrains Mono fonts, libnotify |
| **Account** | a `wheel` user (default `mason`) with sudo, root locked, hostname `masonos` |
| **Finally** | the repo is copied to `~/mason` and `masonos/install.sh --no-apply` runs, so the first login transforms the session |

```bash
bash arch-install.sh                                   # guided
bash arch-install.sh --disk /dev/nvme0n1 --yes          # unattended
bash arch-install.sh --disk /dev/sda --encrypt --user mason --swap 8
bash arch-install.sh --dry-run                          # plan only, no changes
bash arch-install.sh --no-masonos                       # Arch + Plasma, no MasonOS
```

Options: `--disk`, `--user`, `--hostname`, `--timezone`, `--password`,
`--root-password`, `--encrypt`, `--luks-password`, `--swap GiB`/`--no-swap`,
`--gpu auto|intel|amd|nvidia|vm`, `--repo PATH|URL`, `--no-masonos`, `--yes`,
`--dry-run`, `--force-live`.

## The installer window

`arch-install-gui.sh` is the same install with menus instead of questions in the
dark — the way ArchTitus does it. It is a full-screen dialog interface, because
a freshly booted Arch ISO has no desktop to draw a window on; every question
becomes a screen, and the install then runs behind a live log window.

```bash
bash arch-install-gui.sh      # on the Arch ISO
```

On the ISO the one-liner opens it for you: `curl -fsSL …/install.sh | bash`.
Pass flags instead and it stays in plain-text mode.

| Screen | What it asks |
|---|---|
| Welcome | what will happen, and the warning that a disk gets erased |
| Disk | every whole disk with its size and model, live USB hidden, one preselected |
| Account | hostname and username (validated), password twice |
| Timezone | a menu of common zones, or type any zone name |
| Options | encrypt root (LUKS2), install MasonOS, swap on/off and size, GPU driver set |
| Confirm | the whole plan in one box before anything is touched |
| Installing | the installer's own output, streaming, staying up if it fails |
| Done | offers to reboot |

Keys: arrows/Tab to move, Space to tick a box, Enter to accept, Esc to cancel
(nothing is changed if you cancel before the install starts). Encryption asks
for the LUKS2 passphrase up front and hands it to `arch-install.sh` through
`--luks-password`, so the install never sits waiting on an invisible prompt.
Each choice becomes a flag — the window is a front end, not a second installer —
and it all ends up in `/tmp/masonos-arch-install.log`. If `dialog`/`whiptail`
is missing it installs `dialog` from the ISO's own mirrors, and if even that
fails it tells you to run `arch-install.sh`.

It refuses to run anywhere but the live ISO (`--force-live` overrides), refuses
the USB it booted from, refuses x86-incompatible machines (use Arch Linux ARM
for AArch64 — different distro, different bootloader), and unmounts or stops on
mounted partitions rather than formatting under them. Everything is logged to
`/tmp/masonos-arch-install.log`. After `reboot` you log in with your user; from
then on it is the normal `masonosctl on` / `off` story.

## One script, both directions

```bash
masonosctl on         # transform Plasma into MasonOS   (alias: transform)
masonosctl off        # restore the Plasma you had      (alias: revert)
masonosctl reload     # off + on, re-installs assets — what the Desktop icon runs
masonosctl toggle
masonosctl status     # what is applied, and what would be restored
masonosctl display    # output, density, notch, and the bar it would build
masonosctl display --fix   # apply the recommended scaling / bar and rebuild
masonosctl settings   # open the MasonOS Settings app
masonosctl lockscreen # brand the lock screen with MasonOS artwork
masonosctl bot restart     # restart the Mason Bot bridge
masonosctl on --dry-run
```

`~/Desktop/MasonOS.desktop` ("Transform MasonOS") runs `masonosctl reload`, so
double-clicking it drops the shell and brings it straight back.

**Reversibility:** before touching anything, `on` writes a manifest to
`~/.local/state/masonos/manifest.json` containing the previous value of every
setting it changes — colour scheme, fonts, icon theme, Look-and-Feel, Plasma
style, window decoration, cursor theme, KWin script flag, splash theme, your
`appletsrc` and your GTK css. `off` restores all of it and restarts plasmashell
once, so the panels come back exactly as they were.

## MasonOS Settings

`masonosctl settings`, or **MasonOS Settings** in the app grid, opens a small
PySide6 control panel (no Plasma restart needed to open it):

| Page | What it does |
|---|---|
| **Overview** | live state — scheme, style, decoration, panels, display, notch, bot — with Apply / Revert buttons |
| **Bar & dock** | sliders for bar height (40–72px) and dock height (36–80px); *Rebuild panels* re-runs the scripting |
| **Mason Bot** | project URL, edge function and anon key (stored 600 in `~/.config/masonos/bot.json`), restart and health test |
| **Display** | the same report as `masonosctl display`, plus *Apply recommended scaling* |
| **System** | every KDE system panel — display, sound, network, Bluetooth, power, users, printers, shortcuts… — opened with `kcmshell6` in place, plus a button for the full stock System Settings |
| **About** | version and every path it touches |

Geometry lives in `~/.config/masonos/masonos.json` (`barHeight`, `dockHeight`,
default `45`/`48`), read on every transform and on every rebuild. The notch rule
still wins: the bar is never shorter than the notch plus padding.

### It replaces KDE System Settings

MasonOS Settings is the settings app of the desktop, not an extra one:

* `~/.local/share/applications/systemsettings.desktop` shadows the stock entry, so
  **System Settings** in the launcher, in search and in the app grid opens MasonOS
  Settings with the MasonOS icon.
* `~/.local/bin/systemsettings` is a shim ahead of `/usr/bin` on `PATH`, so the
  tray's **Configure …** items and anything else that runs `systemsettings` land
  in MasonOS Settings too. A `kcm_*` request is forwarded to `kcmshell6` (the real
  KDE panel), `kcm_kscreen` opens MasonOS's own Display page, and any other flag
  goes straight to the untouched `/usr/bin/systemsettings`.
* The **System** page lists those panels as buttons — nothing is reimplemented, so
  behaviour and options are exactly KDE's.

`masonosctl off` removes both files (KDE's own entry and binary come back),
`masonosctl on` restores them, and `install.sh --no-apply` still installs them.
The **System → Open KDE System Settings** button always launches the real
`/usr/bin/systemsettings`, shim or not.

## Mason's Software

`masonosctl software`, or **Mason's Software** in the app grid, is the store — a
Discover replacement that uses the distro's own package tool instead of
libpackagekit. It has no daemon, no background service and no root of its own:
it builds the same commands you would type and escalates with `pkexec` for the
one step that needs it.

| Backend | Used for | Install / remove |
|---|---|---|
| `dnf5` (or `dnf`) | Fedora, RHEL, Nobara… | `pkexec dnf5 install -y …` |
| `apt` | Debian, Ubuntu, Mint… | `pkexec apt-get install -y …` |
| `pacman` | Arch, Manjaro, Endeavour… | `pkexec pacman -S --noconfirm …` |
| `yay` / `paru` | the AUR on Arch (search + build) | opened in a terminal — AUR helpers refuse to run as root |
| `zypper` | openSUSE, SLES | `pkexec zypper --non-interactive install …` |
| `flatpak` | every distro, search/list/updates | `flatpak install -y <remote> <app>`, in whichever installation defines that remote (`--user`, or `--system` through `pkexec`) |

Whichever of those exist are detected at startup, so the same app is correct on
the Asahi Fedora box and on an Arch laptop. Each result card shows its source
(repo, `flathub`, `aur`), its version and whether it is already installed, and the
button becomes **Remove** when it is.

### Elevation, and what happens when it fails

Installing needs root, so each action runs through `pkexec`, which asks the
polkit agent for the usual password dialog. Nothing installs if that dialog never
appears — and a polkit agent can be missing or wedged (a compositor restart is
enough to leave the KDE agent reconnecting), in which case `pkexec` exits at once
with `Not authorized` and the package manager never starts.

Mason's Software treats that as a state to recover from, not as success:

1. it checks for a live polkit agent before trying; with none, it goes straight to
   step 2;
2. if `pkexec` returns without the package manager having run, it re-runs the very
   same command inside a terminal window, where `pkexec` can ask for the password
   on the terminal instead of through the agent;
3. a real failure (dependency clash, disk full, no network) is shown in the status
   bar and the package manager's own output is opened in **Activity** — the app
   never reports `Installed …` unless the command actually exited zero.

Every escalated command names its tool by absolute path (`/usr/bin/dnf5`), because
`pkexec` starts it with a sanitised environment. AUR installs always use a
terminal: `yay` refuses to run as root.

Flatpak is scoped by where its remotes actually live. A `--user` install cannot
see a remote that is only defined system-wide — that is what produces
`error: No remote refs found for 'flathub'`. The app queries `flatpak remotes
--user` and `--system` and installs into the matching installation, escalating
with `pkexec` when the remote (and so the app) is system-wide. Removal and
updates follow the installation each app is actually in.

### App pages

Clicking any card (the card, not its button) opens a full page for that app:
icon, name, summary, source and install state, then screenshots, the complete
description and the metadata, with **Install** / **Remove** right there and
**← Back** to wherever you came from.

Where that content comes from, in order:

1. **Flathub's API** (`/api/v2/appstream/<app-id>`) — the real product description
   as HTML, every screenshot at several resolutions, the developer, categories,
   licence, download/installed sizes, the latest release notes and the verified
   badge. Responses are cached for a day in `~/.cache/masonos/appstream`, and
   images in `~/.cache/masonos/images`, so pages reopen instantly and still work
   offline.
2. **AppStream on the machine** (`appstreamcli get --details`) — used to *resolve*
   a native package to its component (`kdenlive` → `org.kde.kdenlive`), so dnf,
   apt, pacman and zypper cards get the same Flathub screenshots and description
   as the Flatpak; it also supplies a plain-text description when Flathub has no
   entry for the app.
3. **The package manager** — last resort long description
   (`dnf5 repoquery --queryformat %{description}`, `apt-cache show`, `pacman -Si`).

When nothing is published — a library, a font, a CLI tool — the page says so
plainly and shows the package's own summary instead of an empty shell.

| Page | What it shows |
|---|---|
| **Discover** | a curated front page — Firefox, GIMP, Inkscape, VLC, Kdenlive, Blender, LibreOffice, Thunderbird, OBS, Steam, Telegram, Krita — from the best source this machine has |
| **Updates** | every newer version across every source, with **Update everything** running each backend's upgrade in turn |
| **Installed** | native packages and Flatpaks, removable straight from the list |
| **Flatpak** | the sandboxed apps you have, from your remotes |

Searching runs every backend at once (DNF repoquery, `apt-cache search`,
`pacman -Ss` + `yay -Ss`, `zypper search`, `flatpak search`) and merges the
results. Output of every install, removal and upgrade streams into the
**Activity** pane, so a failure is visible instead of silent.

### It replaces KDE Discover

Same mechanism as System Settings, and the same one-way rule — nothing in `/usr`
is touched:

* `~/.local/share/applications/masons-software.desktop` is the app's own entry.
* `~/.local/share/applications/org.kde.discover.desktop` shadows Discover's entry
  with `NoDisplay=true`, so the stock store disappears from the grid and search.
* `~/.local/bin/plasma-discover` is a shim ahead of `/usr/bin` on `PATH`, so the
  update notifier and anything else that launches Discover open Mason's Software
  — and fall back to the real binary if the PySide6 Python is ever missing.

`masonosctl off` removes all three and Discover comes back exactly as it was;
`masonosctl on` puts them back. The store only reads and installs through system
tools, so removing MasonOS never removes a package you installed with it.

## Mason's Files

`masonosctl files`, **Mason's Files** in the app grid, or `masons-files ~/Pictures`
opens the file manager. It is a plain Qt file browser over your real filesystem —
no indexing service, no daemon, no database.

| Part | What it does |
|---|---|
| **Sidebar** | Home, Documents, Downloads, Pictures, Music, Videos, Desktop (from `xdg-user-dir`), Computer (`/`), Trash, plus anything mounted under `/run/media`, `/media` or `/mnt` and free space for the current folder |
| **Toolbar** | back / forward / up buttons with real history, an editable location bar (`~/…`, `/`, any path), and a filter box that narrows the current folder as you type |
| **Views** | a details list (name, size, type, modified) and an icon grid, toggled with the ▦ button |
| **Operations** | new folder, rename, copy, cut, paste, move to trash (`gio trash`, so it is restorable), permanent delete with confirmation, empty trash, properties, copy path, open terminal here |
| **Shortcuts** | `Backspace` up · `Alt+←/→` history · `Ctrl+L` location · `Ctrl+H` hidden files · `Ctrl+Shift+N` new folder · `F2` rename · `Ctrl+C/X/V` · `Delete` trash · `Shift+Delete` delete · `Ctrl+A` select all · `Ctrl+T` terminal · `F5` refresh |

Copy, move and delete run on a worker thread with the operation shown in the
status bar, so the window stays responsive while a large folder copies.

`masonosctl files` understands the desktop entry's `%U` form, so
`masons-files file:///home/carter` and opening a folder with *Open With → Mason's
Files* both land on the right place.

### It replaces KDE Dolphin

Dolphin is installed to stay — a file manager should not be a single point of
failure — but nothing on the desktop reaches it any more while MasonOS is on:

| Piece | What it does |
|---|---|
| **Dolphin entry** | `~/.local/share/applications/org.kde.dolphin.desktop` keeps Dolphin's name, icon and pins but runs `masonosctl files`, and is `NoDisplay` so it does not add a second file manager to the grid |
| **`dolphin` shim** | `~/.local/bin/dolphin`, ahead of `/usr/bin`, so anything that runs `dolphin ~/x` opens Mason's Files at `~/x`; with no usable Mason's Files, the real Dolphin gets the call instead |
| **Folder defaults** | `inode/directory` and `x-scheme-handler/file` point at Mason's Files, so double-clicking a folder, dropping one on the desktop, or a file:// link all land there. The previous defaults are remembered and `masonosctl off` restores them |

Dolphin's own switches (`--split`, `--select`, …) have no equivalent here; the
shim takes the path that follows them, which is what those launches mean.

## Mason's Terminal

`masonosctl terminal`, **Mason's Terminal** in the app grid, or `masons-terminal`
opens a terminal in the MasonOS palette. It is a real terminal — a PTY plus its
own VT100/xterm emulator, because Qt has no terminal widget and this distro has
no qtermwidget or VTE bindings — so full-screen programs behave:

| Part | What it does |
|---|---|
| **Emulation** | 16, 256 and truecolour SGR, bold/dim/italic/underline/reverse, cursor addressing, erase/insert/delete characters and lines, scroll regions, the alternate screen used by `vim`, `htop` and `less`, and the window title set by the shell |
| **Scrollback** | 4000 lines, wheel scrolling, mouse selection, `Ctrl+Shift+C` to copy and `Ctrl+Shift+V` or middle-click to paste |
| **Keys** | arrows, `Home`/`End`, `PgUp`/`PgDn`, `Insert`/`Delete`, `F1`–`F12`, `Ctrl+letter`, `Alt+letter`, and application-cursor mode for programs that ask for it |
| **Palette** | `#08080a` background, violet cursor and selection, a sixteen-colour set tuned to stay readable on it |

```bash
masons-terminal                 # your $SHELL, in your home directory
masons-terminal --dir ~/Code    # start somewhere else
masons-terminal -- htop         # run one command instead of a shell
```

Sequences the emulator does not implement are ignored rather than printed as
garbage, so an unknown escape never lands in your output.

## Mason's Launcher (the Super key)

Press **Super** (the Windows key) and the desktop's own application window
opens: favorites on the left, every installed application in the middle,
recent applications and categories on the right, search on top, and
log out / restart / shut down along the bottom.

It is `bin/masons-launcher`, and it lists exactly what Plasma lists — ordinary
`.desktop` files from `~/.local/share/applications`, `/usr/share/applications`
and both Flatpak exports, honouring `NoDisplay`, `Hidden`, `TryExec` and
`Terminal`. Nothing is indexed and nothing is cached: newly installed apps appear
the next time it opens.

| | |
|---|---|
| **Search** | type anywhere — the box is focused on open; `Enter` launches the first match |
| **Keyboard** | `↑ ↓ ← →` move between apps, `Enter` launches, `Esc` clears the search, then closes |
| **Favorites** | right-click any app to add or remove it; stored in `~/.config/masonos/launcher.json` |
| **Recents** | the last eight apps you opened from the launcher, kept in the same file |
| **Categories** | click one to filter the middle column to it; click again to clear |
| **Power** | log out through `org.kde.Shutdown`, restart and shut down through logind |

### How the key gets there

The launcher registers nothing itself. The MasonOS KWin script owns `Meta`
(`registerShortcut("MasonOS Launcher", …, "Meta", …)`) and calls
`org.masonos.Launcher.toggle()` over D-Bus; a user D-Bus service file
(`~/.local/share/dbus-1/services/org.masonos.Launcher.service`) starts
`masons-launcher --service` on demand, so no process sits around until the first
press. `masonosctl off` removes the service file and the KWin script's binding
with the rest of MasonOS.

```bash
masonosctl launcher      # open it without the keyboard
```

## Lock screen and login screen

The lock screen is set up without touching any QML: `masonosctl lockscreen`
installs `share/wallpapers/masonos-lock.png` and points the Plasma lock screen at
it (`~/.config/kscreenlockerrc`, `[Greeter]` + the `org.kde.image` wallpaper
group). The lock UI itself — clock, password field, buttons — is Plasma's own, so
it always unlocks safely and picks up the MasonOS palette automatically.

The login screen on this install is **Plasma Login Manager** (`plasmalogin`), not
SDDM. PLM deliberately does not accept custom QML themes: it is fixed to the
Breeze theme and takes its look from system-wide assets plus
`/etc/plasmalogin.conf`. Branding it is therefore a root, opt-in step:

```bash
cd masonos
./install-greeter.sh            # refuses to run without root
sudo ./install-greeter.sh       # installs artwork + palette, points the greeter at it
```

That script backs `/etc/plasmalogin.conf` up to `.masonos.bak`, installs
`masonos-lock.png` into `/usr/share/wallpapers`, our palette into
`/usr/share/color-schemes`, and sets `[Greeter] WallpaperPluginId=org.kde.image`
with `Image=file:///usr/share/wallpapers/masonos-lock.png`. The change shows on
the next logout or reboot; undo by restoring the backup.

## Display: density and the notch

MasonOS checks the display every time it is applied (and at login, because the
autostart entry runs `on`), then compensates:

* **Density.** It reads the panel's real PPI from KScreen and snaps the scale so
the result lands near 130 effective PPI. This M2 Air panel is 2560x1664 at 224 ppi,
which Plasma had at `1.25` (2048 px of logical width — everything tiny); the
recommended value is `1.75`, ~1463 px logical. The change is applied with
`kscreen-doctor`, remembered in the manifest, and restored by `masonosctl off`.
* **The notch.** Asahi's kernel publishes the notch on the DCP devicetree node
(`/sys/firmware/devicetree/base/soc/dcp*/apple,notch-height`, plus the
`appledrm.show_notch` parameter). Here it is 64px, about 37px at 1.75x, so the top
bar is built at 45px — taller than the notch — and the layout switches to **edge
clusters**: nothing is centred, the clock joins the tray on the right, and the
notch band stays empty instead of hiding the clock. Without a notch, the bar is
40px with the GNOME-style centred clock.

```bash
$ masonosctl display
output      : eDP-1 2560x1664 (logical 1463px wide)
scale       : 1.75  recommended 1.75 (224 ppi -> 128 ppi effective)
notch       : 64px physical, 37px logical, visible
top bar     : 45px, edge clusters with the centre clear
```

## What actually changes

| Surface | How |
|---|---|
| **Top bar + dock** | built live through Plasma scripting: MasonOS launcher, centred clock (right-hand cluster on notched panels), Mason Bot pill, tray, and a floating dock (48px by default, adjustable) drawn as a rounded glass capsule with a violet rim and rounded task tiles |
| **Palette** | `share/color-schemes/MasonOS.colors` — mason-web tokens (`#08080a` … `#8b5cf6`) |
| **Plasma style** | `share/desktoptheme/com.mason.masonos` — violet-black glass frames with real rounded corners for the bar/dock (`panel-background`) and rounded task tiles (`tasks`); everything else inherits the `default` theme's assets |
| **Look-and-Feel** | `share/look-and-feel/com.mason.masonos` — one package that bundles palette, style, icons, decoration and the **login splash** (MasonOS mark, wordmark, progress bar) |
| **Window decoration** | `share/aurorae/themes/MasonOS` — 24px rounded titlebar with a centred title, glyph-only minimize/maximize/close (no plates behind them), accent glyph on hover, and a 1px frame down the sides and along the bottom. Every fill is a literal colour: the earlier gradient-filled, top-only frame could lose its background after maximize/fullscreen or a compositor restart, which left the title and buttons painting on a see-through strip |
| **Icons** | `share/icons/MasonOS` inherits `breeze-dark` and overrides only the launcher/brand marks |
| **GTK apps** | `share/gtk/masonos.css` included from `gtk-3.0/gtk.css` and `gtk-4.0/gtk.css` |
| **Behaviour** | `share/kwin/masonos-shell` KWin script: guarded tile/maximize/show-desktop shortcuts, and `Meta` opens Mason's Launcher (Plasma's own launcher gives the key up while MasonOS is on) |
| **Apps** | MasonOS Settings (in place of System Settings), Mason's Software (in place of Discover), Mason's Files (in place of Dolphin), Mason's Terminal, and Mason's Launcher on `Meta` |
| **Mason Bot** | `share/plasmoids/com.mason.masonos.bot` + `bot/masonos-bot.py` loopback bridge to `smooth-service` |

## Mason Bot

The pill opens the chat; it is the same assistant as mason-web (same greeting,
starters and `smooth-service` backend). Credentials live in
`~/.config/masonos/bot.json` (mode 600), imported from the repo `.env` at install
time. The panel talks to `127.0.0.1:8765`, so the key never enters QML.

* Health: `curl -s 127.0.0.1:8765/health`
* Log: `~/.cache/masonos/bot.log`
* Started by `masonosctl on`, stopped by `masonosctl off`

## Uninstall

```bash
./uninstall.sh
```

Reverts the session first, then removes the widget, KWin script, themes, palette,
wallpaper, desktop icon, autostart entry and GTK include, and the Settings and
Software launchers and shims (Discover and System Settings come back).

## Limits

* Plasma 6 only (6.0+; tested on 6.8.2, Fedora Asahi Remix 45, M2 Air). Plasma 5's
  packaging and QML differ too much, so the installer and `masonosctl` refuse it
  with an explicit message instead of applying a half-broken theme.
* X11 works, but KDE's fractional scaling is Wayland-only, so the PPI correction
  is skipped there and MasonOS keeps your integer scale.
* `on`/`off` rewrite your panel layout — that is what a shell does. Anything you
  hand-tune while MasonOS is applied belongs to MasonOS.
* Boot-time branding (Plymouth) is **not** touched: boot assets need root. The
  login *splash* is themed. The login *screen* is Plasma Login Manager, which only
  takes system-wide assets — use `install-greeter.sh` for that.
* Fractional scaling (`1.75`) is a Wayland feature; XWayland apps can look soft.
  `masonosctl on` never scales *down* below your current setting, so if you prefer
  a different density, set it in System Settings → Display and MasonOS keeps it
  unless it is far below the recommendation.
* MasonOS is the shell and the look, not a new compositor: KWin and Wayland stay,
  because that is the part Asahi tuned for the M2's GPU.
