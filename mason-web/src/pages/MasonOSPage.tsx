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
    title: 'Notch-aware by default',
    body: 'Reads apple,notch-height from the kernel devicetree and sizes the bar around the notch, keeping the centre band empty and the clock on the right.',
  },
  {
    title: 'Mason Bot in the bar',
    body: 'The same assistant as the site, as a panel widget talking to a loopback bridge. Keys stay in ~/.config, never in QML.',
  },
  {
    title: 'MasonOS Settings',
    body: 'A PySide6 control panel for bar and dock height, bot credentials, display scaling, and apply/revert — no terminal needed.',
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
  ['Display', 'Snaps the session to ~130 effective PPI (1.75× on the 2560×1664 Air panel)'],
];

const REQUIREMENTS = [
  'Fedora Asahi Remix (works on any Fedora KDE spin with Plasma 6.8)',
  'Wayland session — fractional scaling and the notch handling need it',
  'No root for the desktop shell; only the optional login-screen step needs sudo',
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
        lead="MasonOS turns a stock Plasma 6 install into a GNOME-shaped, notch-aware desktop with Mason Bot living in the top bar. Everything is reversible, and it all installs into your home directory."
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
        Plasma 6.8 · Wayland · Fedora Asahi · no root · reversible
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
          <dt>Dependencies</dt>
          <dd>none to fetch</dd>
        </div>
      </dl>

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
