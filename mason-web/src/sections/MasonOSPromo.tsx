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
        lead="A desktop environment built from scratch on top of KDE Plasma 6 — Mason-shaped panels, notch-aware top bar, Mason Bot in the bar, and one command to undo it all."
      >
        <Link to="/masonos" className="btn">
          Meet MasonOS
        </Link>
      </SectionIntro>

      <div className="code-block">
        <pre>
          <code>{INSTALL_ONE_LINER}</code>
        </pre>
        <span className="code-block__hint">Fedora Asahi Remix · Plasma 6.8 · Wayland</span>
      </div>
    </div>
  );
}
