import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSiteEffects } from '../hooks/useSiteEffects';
import { CustomAudioPlayer } from './CustomAudioPlayer';

const nav = [
  { to: '/', label: 'Home' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/game', label: 'Game' },
  { to: '/why', label: 'About' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/forums', label: 'Forums' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact' },
  { to: '/account', label: 'Account' },
];

export function Layout() {
  const { maintenance, blockModal } = useSiteEffects();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const lock = Boolean(blockModal?.enabled || maintenance);
    document.documentElement.style.overflow = lock ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [blockModal?.enabled, maintenance]);

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

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink to="/" className="app-logo" end onClick={() => setNavOpen(false)}>
            <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M12 2L2 7v7c0 5 4 8 10 8s10-3 10-8V7l-10-5z"
              />
            </svg>
            <span className="app-logo-text">Sex With Mason</span>
          </NavLink>
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
            {nav.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => (isActive ? 'active' : '')}
                end={to === '/'}
                onClick={() => setNavOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <div className="audio-banner">
        <div className="audio-banner-inner">
          <div className="audio-banner-title">Nut For Me — Pegger Productions</div>
          <div className="audio-banner-player">
            <CustomAudioPlayer src="/nutforme.mp3" aria-label="Play Nut For Me" />
          </div>
          <NavLink to="/nutforme" className="btn btn-ghost audio-banner-cta" onClick={() => setNavOpen(false)}>
            Review this track
          </NavLink>
        </div>
      </div>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <NavLink to="/order">Order</NavLink>
          <NavLink to="/game">Game</NavLink>
          <NavLink to="/music">Music</NavLink>
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
