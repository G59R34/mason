import { Link } from 'react-router-dom';
import { SectionIntro } from '../components/SectionIntro';

export const INSTALL_ONE_LINER = 'curl -fsSL https://sexwithmason.com/masonos/install.sh | bash';

/** Home-page advertisement for MasonOS; the full pitch lives at /masonos. */
export function MasonOSPromo() {
  return (
    <div className="masonos-promo">
      <SectionIntro
        eyebrow="Side project"
        title="MasonOS"
        lead="A desktop environment built from scratch on top of KDE Plasma 6 — Mason-shaped panels, notch-aware top bar, Mason Bot in the bar, and one command to undo it all. Works on any distro, any GPU, Wayland or X11."
      >
        <Link to="/masonos" className="btn">
          Meet MasonOS
        </Link>
      </SectionIntro>

      <div className="code-block">
        <pre>
          <code>{INSTALL_ONE_LINER}</code>
        </pre>
        <span className="code-block__hint">KDE Plasma 6 · any distro</span>
      </div>
    </div>
  );
}
