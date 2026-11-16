import { useCallback, useEffect, useRef, useState } from 'react';
import { SectionIntro } from '../components/SectionIntro';
import { INSTALL_ONE_LINER } from '../sections/MasonOSPromo';

const SCRIPT_URL = 'https://sexwithmason.com/masonos/install.sh';
const TARBALL_URL = 'https://sexwithmason.com/masonos/masonos.tar.gz';
const UNINSTALL_ONE_LINER = 'masonosctl off && ~/.local/share/masonos/uninstall.sh';

const FEATURES = [
  {
    title: 'A real shell, not a skin',
    body: 'Panels, clock, tray and dock are built live with Plasma scripting — no compositor swap, so KWin keeps the M2 GPU path Asahi tuned.',
  },
  {
    title: 'Notch-aware, not notch-bound',
    body: 'On an Asahi MacBook it reads apple,notch-height from the devicetree and sizes the bar around the notch; anywhere else it falls back to the centred-clock layout.',
  },
  {
    title: 'Portable by design',
    body: 'Nothing distro-specific: busctl with a gdbus fallback for scripting, kscreen-doctor only if present, PySide6 only for the settings app, no notch required.',
  },
  {
    title: 'Mason Bot in the bar',
    body: 'The same assistant as the site, as a panel widget talking to a loopback bridge. Keys stay in ~/.config, never in QML.',
  },
  {
    title: 'It is System Settings',
    body: 'MasonOS Settings replaces the KDE one: the launcher entry and the tray’s Configure items open it, and its System page lists every real KDE panel — display, sound, network, power, users, printers — one click deep.',
  },
  {
    title: 'Themed end to end',
    body: 'Palette, plasma style, Look-and-Feel, splash, window decoration, icons, GTK accent, lock screen artwork.',
  },
  {
    title: 'One command out',
    body: 'Every change is snapshotted in a manifest. masonosctl off puts your previous scheme, fonts, decoration and panels back exactly.',
  },
];

const CHANGES = [
  ['Top bar + dock', 'MasonOS launcher, centred clock (right cluster on notched panels), Mason Bot pill, tray, floating dock'],
  ['Palette + plasma style', '#08080a → #8b5cf6 across every Plasma surface, rounded glass panels'],
  ['Window decoration', '24px rounded titlebar, glyph-only controls, no seam under the bar'],
  ['Look-and-Feel', 'Bundles palette, style, icons, decoration and the login splash'],
  ['Lock screen', 'MasonOS artwork behind Plasma’s own unlock UI'],
  ['Settings', 'MasonOS Settings takes over the System Settings entry and shim; the KDE panels are still there, in-app'],
  ['Display', 'On Wayland, snaps the session to ~130 effective PPI (1.75× on the 2560×1664 Air panel); on X11 your scale is left alone'],
];

const REQUIREMENTS = [
  'Any distro running KDE Plasma 6.0 or newer — Fedora, Arch, Debian, Ubuntu, openSUSE, Bazzite, Nobara, NixOS…',
  'Wayland or X11 — the PPI correction is applied on Wayland, and your integer scale is left alone on X11',
  'Intel, AMD, NVIDIA or Apple Silicon; the notch is detected, and without one the bar uses the centred clock',
  'No root for the desktop shell; only the optional login-screen step needs sudo',
];

const COMPAT = [
  {
    label: 'Distros',
    items: ['Fedora', 'Arch', 'Debian', 'Ubuntu', 'openSUSE', 'Bazzite', 'Nobara', 'NixOS'],
  },
  {
    label: 'Desktop',
    items: ['KDE Plasma 6.0+', 'KWin / Aurorae', 'Wayland', 'X11'],
  },
  {
    label: 'GPUs',
    items: ['Intel', 'AMD', 'NVIDIA', 'Apple Silicon'],
  },
  {
    label: 'Displays',
    items: ['Notched laptops', 'HiDPI', 'Multi-monitor', 'Standard panels'],
  },
];

export function MasonOSPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const copy = useCallback(async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(key);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 1800);
  }, []);

  return (
    <div className="masonos-page">
      <SectionIntro
        eyebrow="MasonOS"
        title="A desktop environment, built from scratch"
        lead="MasonOS turns any KDE Plasma 6 desktop into a GNOME-shaped, notch-aware shell with Mason Bot living in the top bar. Any distro, any GPU, Wayland or X11 — and everything is reversible."
      />

      <div className="code-block code-block--hero">
        <pre>
          <code>{INSTALL_ONE_LINER}</code>
        </pre>
        <button
          type="button"
          className="code-block__copy"
          onClick={() => copy(INSTALL_ONE_LINER, 'install')}
        >
          {copied === 'install' ? 'Copied' : 'Copy'}
        </button>
      </div>

      <p className="tag-line">
        KDE Plasma 6 · any distro · any GPU · Wayland or X11 · no root · reversible
      </p>

      <figure className="masonos-shot">
        <img
          src="/masonos/preview.png"
          alt="MasonOS artwork: the MasonOS gradient wallpaper with the MasonOS wordmark"
          width={800}
          height={520}
        />
        <figcaption className="muted">
          MasonOS 1.0 — gnome-shaped, plasma-powered
        </figcaption>
      </figure>

      <dl className="facts">
        <div>
          <dt>Install</dt>
          <dd>one command</dd>
        </div>
        <div>
          <dt>Uninstall</dt>
          <dd>one command</dd>
        </div>
        <div>
          <dt>Requires</dt>
          <dd>KDE Plasma 6</dd>
        </div>
      </dl>

      <section className="section masonos-compat-section">
        <h3 className="subhead">Runs on anything Plasma 6 runs on</h3>
        <p className="muted">
          MasonOS checks your session at install time and again on every apply —
          distro, session type, GPU and panel — then only touches what it finds.
          Built and tested on Fedora Asahi Remix 45 on an M2 MacBook Air; nothing
          in it is Fedora- or Apple-specific.
        </p>
        <dl className="masonos-compat">
          {COMPAT.map((group) => (
            <div key={group.label}>
              <dt>{group.label}</dt>
              <dd>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="section">
        <h3 className="subhead">What it does</h3>
        <ul className="tile-grid">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="tile">
              <h4>{feature.title}</h4>
              <p className="muted">{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h3 className="subhead">What actually changes</h3>
        <ul className="masonos-changes">
          {CHANGES.map(([label, detail]) => (
            <li key={label}>
              <strong>{label}</strong>
              <span className="muted">{detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h3 className="subhead">Install</h3>
        <p className="muted">
          Run it in a terminal. The bootstrap downloads the package, verifies its
          checksum, and hands over to the real installer — which transforms the
          running session immediately.
        </p>

        <div className="code-block">
          <pre>
            <code>$ {INSTALL_ONE_LINER}</code>
          </pre>
          <button
            type="button"
            className="code-block__copy"
            onClick={() => copy(INSTALL_ONE_LINER, 'install-2')}
          >
            {copied === 'install-2' ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="masonos-links">
          <a href={SCRIPT_URL} target="_blank" rel="noreferrer" className="btn btn-ghost">
            Read install.sh
          </a>
          <a href={TARBALL_URL} className="btn btn-ghost" download>
            Download the package
          </a>
        </div>

        <p className="muted">
          Prefer to look before you leap? Save the script, read it, then run it:
        </p>
        <div className="code-block">
          <pre>
            <code>{'curl -fsSLO https://sexwithmason.com/masonos/install.sh\nless install.sh\nbash install.sh'}</code>
          </pre>
        </div>
      </section>

      <section className="section">
        <h3 className="subhead">Requirements</h3>
        <ul className="masonos-list">
          {REQUIREMENTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h3 className="subhead">Undo</h3>
        <p className="muted">
          <code>masonosctl off</code> restores your previous scheme, fonts, icon
          theme, decoration, splash, cursor, KWin script and panel layout. To remove
          the files as well:
        </p>
        <div className="code-block">
          <pre>
            <code>$ {UNINSTALL_ONE_LINER}</code>
          </pre>
          <button
            type="button"
            className="code-block__copy"
            onClick={() => copy(UNINSTALL_ONE_LINER, 'uninstall')}
          >
            {copied === 'uninstall' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </section>

      <div className="cta-band">
        <p>Want the whole story? It lives in the same repo as this site.</p>
        <a
          href="https://github.com/mason/mason/tree/main/masonos"
          target="_blank"
          rel="noreferrer"
          className="btn"
        >
          Read the source
        </a>
      </div>
    </div>
  );
}
