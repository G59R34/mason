# MasonOS

A desktop identity for Fedora Asahi Remix: KDE Plasma 6 transformed into a
GNOME-shaped shell called **MasonOS**, styled from `mason-web`, with Mason Bot in
the top bar.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◈            (notch)              MB Mason Bot  ⌄ ⌄ ⏻  Wed 20:41    │
└──────────────────────────────────────────────────────────────────────┘
                     ▢   ▢   ▢   ▢   ▢          ← dock
```

On a notched panel the bar leaves its centre empty, because that is where the
notch sits: launcher on the left, bot + tray + clock on the right.

## Install it

```bash
cd masonos
./install.sh                 # installs + transforms immediately
./install.sh --no-apply      # install the files, transform later
```

Everything lands in `~/.local`; nothing needs root. `install.sh` also migrates a
pre-rename MasonDE install (removes the old widget, moves state and bot config,
remembers your original settings).

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
| **About** | version and every path it touches |

Geometry lives in `~/.config/masonos/masonos.json` (`barHeight`, `dockHeight`,
default `45`/`48`), read on every transform and on every rebuild. The notch rule
still wins: the bar is never shorter than the notch plus padding.

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
| **Window decoration** | `share/aurorae/themes/MasonOS` — 24px rounded titlebar with a centred title, glyph-only minimize/maximize/close (no plates behind them), accent glyph on hover. The frame is exactly the titlebar: no side/bottom borders and no title edges, so the client area starts right below the bar instead of leaving a see-through seam |
| **Icons** | `share/icons/MasonOS` inherits `breeze-dark` and overrides only the launcher/brand marks |
| **GTK apps** | `share/gtk/masonos.css` included from `gtk-3.0/gtk.css` and `gtk-4.0/gtk.css` |
| **Behaviour** | `share/kwin/masonos-shell` KWin script: guarded tile/maximize/show-desktop shortcuts |
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
wallpaper, desktop icon, autostart entry and GTK include.

## Limits

* Plasma 6 on Wayland (tested on 6.8.2, Fedora Asahi Remix 45, M2 Air).
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
