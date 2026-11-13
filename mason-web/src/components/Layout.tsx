import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { DEFAULT_MASONCORD_PUBLIC_URL, useSiteEffects } from '../hooks/useSiteEffects';
import { MENU_GROUPS } from '../lib/siteNav';
import { FloatingAnnouncement } from './FloatingAnnouncement';
import { SiteHeader } from './SiteHeader';
import { SiteAudioBanner } from './SiteAudioBanner';
import { WhatsNewModal } from './WhatsNewModal';
import { MasonBot } from './MasonBot';

export function Layout() {
  const { maintenance, blockModal, masoncordPublicUrl } = useSiteEffects();
  const masoncordHref =
    masoncordPublicUrl.trim() || import.meta.env.VITE_MASONCORD_URL?.trim() || DEFAULT_MASONCORD_PUBLIC_URL;
  const location = useLocation();
  const isGame = location.pathname === '/game';

  return (
    <div className={isGame ? 'app-shell app-shell--game-fs' : 'app-shell'}>
      {!isGame && (
        <>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <SiteHeader masoncordHref={masoncordHref} />
          <FloatingAnnouncement />
          <WhatsNewModal />
          <MasonBot />
        </>
      )}

      {isGame ? (
        <div className="game-route-outlet">
          <Outlet />
        </div>
      ) : (
        <main id="main" className="main-content">
          <Outlet />
        </main>
      )}

      {!isGame && (
        <>
          <SiteAudioBanner variant="inline" />

          <footer className="site-footer">
            <div className="site-footer__inner">
              <div className="site-footer__brand">
                <span className="brand__name">Sex With Mason</span>
                <p className="site-footer__tag">
                  Private sessions, original music, and a place to talk about it.
                </p>
              </div>

              <div className="site-footer__links">
                {MENU_GROUPS.map((group) => (
                  <nav key={group.title} className="site-footer__col" aria-label={group.title}>
                    <h2 className="site-footer__col-title">{group.title}</h2>
                    <ul>
                      {group.items.map((item) => (
                        <li key={item.kind === 'route' ? item.to : item.id}>
                          {item.kind === 'route' ? (
                            <NavLink to={item.to} end={item.end}>
                              {item.label}
                            </NavLink>
                          ) : (
                            <Link to={{ pathname: '/', hash: item.id }}>{item.label}</Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </nav>
                ))}
              </div>
            </div>

            <div className="site-footer__bottom">
              <span>© {new Date().getFullYear()} Sex With Mason</span>
              <div className="site-footer__bottom-links">
                <a href={masoncordHref} target="_blank" rel="noreferrer">
                  Masoncord ↗
                </a>
                <button
                  type="button"
                  className="site-footer__top-btn"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Back to top
                </button>
              </div>
            </div>
          </footer>
        </>
      )}

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
