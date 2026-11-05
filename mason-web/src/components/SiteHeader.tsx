import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { MENU_GROUPS, PRIMARY_NAV, isSectionActive, sectionHref } from '../lib/siteNav';
import { HeaderAnnouncements } from './HeaderAnnouncements';

const Wordmark = () => (
  <>
    <span className="brand__mark" aria-hidden>
      <svg width="26" height="26" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 2L2 7v7c0 5 4 8 10 8s10-3 10-8V7l-10-5z" />
      </svg>
    </span>
    <span className="brand__name">Sex With Mason</span>
  </>
);

export function SiteHeader({ masoncordHref }: { masoncordHref: string }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.classList.add('nav-drawer-open');
    closeButtonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.classList.remove('nav-drawer-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    /* Return focus after the drawer unmounts, outside of this render pass. */
    window.requestAnimationFrame(() => toggleRef.current?.focus());
  };

  const goToSection = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === '/') {
      e.preventDefault();
      if (id === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.history.replaceState(null, '', '/');
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', sectionHref(id));
      }
    }
    closeMenu();
  };

  return (
    <>
      <header className="site-header">
        <div className="site-header__bar">
          <Link
            to="/"
            className="brand"
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                window.history.replaceState(null, '', '/');
              }
            }}
          >
            <Wordmark />
          </Link>

          <nav className="site-nav" aria-label="Sections">
            {PRIMARY_NAV.map((item) =>
              item.kind === 'route' ? (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ) : (
                <Link
                  key={item.id}
                  to={{ pathname: '/', hash: item.id }}
                  className={`site-nav__link${isSectionActive(item.id, location.pathname, location.hash) ? ' is-active' : ''}`}
                  onClick={goToSection(item.id)}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="site-header__actions">
            <Link
              to={{ pathname: '/', hash: 'pricing' }}
              className="btn btn--sm"
              onClick={goToSection('pricing')}
            >
              Book
            </Link>
            <button
              ref={toggleRef}
              type="button"
              className="menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setMenuOpen(true)}
            >
              <span className="visually-hidden">Open menu</span>
              <span className="menu-toggle__bars" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>

        <HeaderAnnouncements />
      </header>

      {menuOpen ? (
        <>
          <div className="menu-backdrop" aria-hidden onClick={closeMenu} />

          <div id="site-menu" className="site-menu" role="dialog" aria-modal="true" aria-label="Site menu">
            <div className="site-menu__head">
              <span className="site-menu__title">Menu</span>
              <button
                ref={closeButtonRef}
                type="button"
                className="menu-close"
                aria-label="Close menu"
                onClick={closeMenu}
              >
                <span aria-hidden>×</span>
              </button>
            </div>

            <nav className="site-menu__body" aria-label="All pages">
              {MENU_GROUPS.map((group) => (
                <div key={group.title} className="site-menu__group">
                  <h2 className="site-menu__group-title">{group.title}</h2>
                  <ul className="site-menu__list">
                    {group.items.map((item) => {
                      const key = item.kind === 'route' ? item.to : item.id;
                      return (
                        <li key={key}>
                          {item.kind === 'route' ? (
                            <NavLink
                              to={item.to}
                              end={item.end}
                              className={({ isActive }) => `site-menu__link${isActive ? ' is-active' : ''}`}
                              onClick={closeMenu}
                            >
                              {item.label}
                            </NavLink>
                          ) : (
                            <Link
                              to={{ pathname: '/', hash: item.id }}
                              className={`site-menu__link${isSectionActive(item.id, location.pathname, location.hash) ? ' is-active' : ''}`}
                              onClick={goToSection(item.id)}
                            >
                              {item.label}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="site-menu__foot">
              <a href={masoncordHref} target="_blank" rel="noreferrer">
                Masoncord ↗
              </a>
              <Link
                to={{ pathname: '/', hash: 'pricing' }}
                className="site-menu__foot-btn"
                onClick={goToSection('pricing')}
              >
                Book a session
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
