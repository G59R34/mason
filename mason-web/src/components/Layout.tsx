import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { DEFAULT_MASONCORD_PUBLIC_URL, useSiteEffects } from '../hooks/useSiteEffects';
import { CustomAudioPlayer } from './CustomAudioPlayer';
import { FloatingAnnouncement } from './FloatingAnnouncement';
import { HeaderAnnouncements } from './HeaderAnnouncements';
import { WhatsNewModal } from './WhatsNewModal';

type NavItem =
  | { kind: 'section'; id: string; label: string }
  | { kind: 'route'; to: string; label: string; end?: boolean };

const nav: NavItem[] = [
  { kind: 'section', id: 'top', label: 'Home' },
  { kind: 'section', id: 'gallery', label: 'Gallery' },
  { kind: 'route', to: '/game', label: 'Game' },
  { kind: 'route', to: '/schedule', label: 'Schedule' },
  { kind: 'section', id: 'about', label: 'About' },
  { kind: 'section', id: 'reviews', label: 'Reviews' },
  { kind: 'section', id: 'forums', label: 'Forums' },
  { kind: 'section', id: 'pricing', label: 'Pricing' },
  { kind: 'section', id: 'contact', label: 'Contact' },
  { kind: 'route', to: '/tickets', label: 'Tickets' },
  { kind: 'route', to: '/account', label: 'Account' },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', id === 'top' ? '/' : `/#${id}`);
}

function MainNavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: () => void;
}) {
  const { pathname, hash } = useLocation();

  if (item.kind === 'route') {
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) => (isActive ? 'active' : '')}
        end={item.end}
        onClick={onNavigate}
      >
        {item.label}
      </NavLink>
    );
  }

  const active =
    pathname === '/' &&
    (item.id === 'top' ? !hash || hash === '#top' : hash === `#${item.id}`);

  const href = item.id === 'top' ? '/' : `/#${item.id}`;

  return (
    <a
      href={href}
      className={active ? 'active' : ''}
      onClick={(e) => {
        if (pathname === '/') {
          e.preventDefault();
          scrollToSection(item.id);
          onNavigate();
        }
      }}
    >
      {item.label}
    </a>
  );
}

export function Layout() {
  const { maintenance, blockModal, masoncordPublicUrl } = useSiteEffects();
  const masoncordHref =
    masoncordPublicUrl.trim() || import.meta.env.VITE_MASONCORD_URL?.trim() || DEFAULT_MASONCORD_PUBLIC_URL;
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  const isGame = location.pathname === '/game';

  useEffect(() => {
    const lock = Boolean(blockModal?.enabled || maintenance) || isGame;
    document.documentElement.style.overflow = lock ? 'hidden' : '';
    document.body.style.overflow = isGame ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [blockModal?.enabled, maintenance, isGame]);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (navOpen) {
      document.body.classList.add('nav-drawer-open');
    } else {
      document.body.classList.remove('nav-drawer-open');
    }
    return () => document.body.classList.remove('nav-drawer-open');
  }, [navOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (isGame) {
    return (
      <div className="app-shell app-shell--game-fs">
        <Outlet />
        {maintenance && (
          <div className="ms-maintenance" role="alert">
            <div className="ms-maintenance-inner">Mason is With a client</div>
          </div>
        )}
        {blockModal?.enabled && (
          <div className="ms-admin-block-modal" role="dialog" aria-modal aria-labelledby="block-title">
            <div className="ms-admin-block-modal-backdrop" />
            <div className="ms-admin-block-modal-dialog">
              <h2 id="block-title">{blockModal.title || 'Notice'}</h2>
              {blockModal.body ? <div className="ms-admin-block-modal-body">{blockModal.body}</div> : null}
              {blockModal.cta_label && blockModal.cta_url ? (
                <div className="ms-admin-block-modal-cta">
                  <a href={blockModal.cta_url}>{blockModal.cta_label}</a>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink
            to="/"
            className="app-logo"
            end
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                scrollToSection('top');
              }
              setNavOpen(false);
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M12 2L2 7v7c0 5 4 8 10 8s10-3 10-8V7l-10-5z"
              />
            </svg>
            <span className="app-logo-text">Sex With Mason</span>
          </NavLink>
          <div className="app-header-center">
            <HeaderAnnouncements />
          </div>
          <button
            type="button"
            className="app-nav-toggle"
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
          <div
            className={`app-nav-backdrop ${navOpen ? 'is-visible' : ''}`}
            aria-hidden
            onClick={() => setNavOpen(false)}
          />
          <nav id="primary-nav" className={`app-nav ${navOpen ? 'is-open' : ''}`} aria-label="Main">
            {nav.map((item) => (
              <MainNavLink key={item.kind === 'section' ? item.id : item.to} item={item} onNavigate={() => setNavOpen(false)} />
            ))}
          </nav>
        </div>
      </header>

      <FloatingAnnouncement />
      <WhatsNewModal />

      <div className="audio-banner">
        <div className="audio-banner-inner">
          <div className="audio-banner-title">Nut For Me — Pegger Productions</div>
          <div className="audio-banner-player">
            <CustomAudioPlayer src="/nutforme.mp3" aria-label="Play Nut For Me" />
          </div>
          <a href="/#music" className="btn btn-ghost audio-banner-cta" onClick={() => setNavOpen(false)}>
            Review this track
          </a>
        </div>
      </div>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <NavLink to="/order">Order</NavLink>
          <NavLink to="/game">Game</NavLink>
          <NavLink to="/schedule">Schedule</NavLink>
          <a href="/#music">Music</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#contact">Contact</a>
          <a href={masoncordHref} target="_blank" rel="noreferrer">
            Masoncord
          </a>
          <NavLink to="/tickets">Tickets</NavLink>
          <NavLink to="/session">Session chat</NavLink>
        </div>
      </footer>

      {maintenance && (
        <div className="ms-maintenance" role="alert">
          <div className="ms-maintenance-inner">Mason is With a client</div>
        </div>
      )}

      {blockModal?.enabled && (
        <div className="ms-admin-block-modal" role="dialog" aria-modal aria-labelledby="block-title">
          <div className="ms-admin-block-modal-backdrop" />
          <div className="ms-admin-block-modal-dialog">
            <h2 id="block-title">{blockModal.title || 'Notice'}</h2>
            {blockModal.body ? <div className="ms-admin-block-modal-body">{blockModal.body}</div> : null}
            {blockModal.cta_label && blockModal.cta_url ? (
              <div className="ms-admin-block-modal-cta">
                <a href={blockModal.cta_url}>{blockModal.cta_label}</a>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
