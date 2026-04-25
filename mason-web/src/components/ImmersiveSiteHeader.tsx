import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { HeaderAnnouncements } from './HeaderAnnouncements';

export type NavItem =
  | { kind: 'section'; id: string; label: string }
  | { kind: 'route'; to: string; label: string; end?: boolean };

export const PRIMARY_NAV: NavItem[] = [
  { kind: 'section', id: 'top', label: 'Home' },
  { kind: 'section', id: 'gallery', label: 'Gallery' },
  { kind: 'route', to: '/discography', label: 'Discography' },
  { kind: 'route', to: '/game', label: 'Game' },
  { kind: 'route', to: '/schedule', label: 'Schedule' },
  { kind: 'section', id: 'about', label: 'About' },
  { kind: 'section', id: 'reviews', label: 'Reviews' },
  { kind: 'section', id: 'forums', label: 'Forums' },
  { kind: 'section', id: 'pricing', label: 'Pricing' },
  { kind: 'section', id: 'contact', label: 'Contact' },
  { kind: 'route', to: '/tickets', label: 'Tickets' },
  { kind: 'route', to: '/reels', label: 'Reels' },
  { kind: 'route', to: '/account', label: 'Account' },
];

export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', id === 'top' ? '/' : `/#${id}`);
}

function NavRouteLink({
  to,
  label,
  end,
  onNavigate,
}: {
  to: string;
  label: string;
  end?: boolean;
  onNavigate: () => void;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `immersive-nav-link${isActive ? ' active' : ''}`}
      end={end}
      onClick={onNavigate}
    >
      <span className="immersive-nav-link__label">{label}</span>
    </NavLink>
  );
}

function NavSectionLink({
  id,
  label,
  onNavigate,
}: {
  id: string;
  label: string;
  onNavigate: () => void;
}) {
  const { pathname, hash } = useLocation();
  const active =
    pathname === '/' && (id === 'top' ? !hash || hash === '#top' : hash === `#${id}`);
  const sectionTo = id === 'top' ? '/' : { pathname: '/' as const, hash: id };

  return (
    <Link
      to={sectionTo}
      className={`immersive-nav-link${active ? ' active' : ''}`}
      onClick={(e) => {
        onNavigate();
        if (pathname === '/') {
          e.preventDefault();
          scrollToSection(id);
        }
      }}
    >
      <span className="immersive-nav-link__label">{label}</span>
    </Link>
  );
}

export function ImmersiveSiteHeader() {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (navOpen) {
      document.body.classList.add('nav-drawer-open');
    } else {
      document.body.classList.remove('nav-drawer-open');
    }
    return () => document.body.classList.remove('nav-drawer-open');
  }, [navOpen]);

  return (
    <header className="app-header immersive-header">
      <div className="immersive-header__stack">
        <div className="app-header-inner immersive-header__top">
          <NavLink
            to="/"
            className="app-logo immersive-header__logo"
            end
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                scrollToSection('top');
              }
              setNavOpen(false);
            }}
          >
            <span className="immersive-header__logo-mark" aria-hidden>
              <svg width="34" height="34" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 2L2 7v7c0 5 4 8 10 8s10-3 10-8V7l-10-5z"
                />
              </svg>
            </span>
            <span className="app-logo-text">Sex With Mason</span>
          </NavLink>
          <div className="app-header-center immersive-header__announce">
            <HeaderAnnouncements />
          </div>
          <button
            type="button"
            className="app-nav-toggle immersive-header__menu-btn"
            aria-expanded={navOpen}
            aria-controls="primary-nav"
            onClick={() => setNavOpen((o) => !o)}
          >
            <span className="visually-hidden">Menu</span>
            <span className={`app-nav-toggle-bars ${navOpen ? 'is-open' : ''}`} aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>

        <div
          className={`app-nav-backdrop immersive-nav-backdrop ${navOpen ? 'is-visible' : ''}`}
          aria-hidden
          onClick={() => setNavOpen(false)}
        />

        <div className="immersive-nav-rail">
          <div className="immersive-nav-rail__perspect">
            <div className="immersive-nav-rail__stage">
              <div className="immersive-nav-rail__glow" aria-hidden />
              <div className="immersive-nav-rail__chrome" aria-hidden />
              <nav id="primary-nav" className={`app-nav immersive-nav ${navOpen ? 'is-open' : ''}`} aria-label="Main">
              {PRIMARY_NAV.map((item) =>
                item.kind === 'route' ? (
                  <NavRouteLink
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    end={item.end}
                    onNavigate={() => setNavOpen(false)}
                  />
                ) : (
                  <NavSectionLink
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    onNavigate={() => setNavOpen(false)}
                  />
                ),
              )}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
