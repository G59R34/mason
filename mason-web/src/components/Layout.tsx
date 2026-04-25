import { lazy, Suspense, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { DEFAULT_MASONCORD_PUBLIC_URL, useSiteEffects } from '../hooks/useSiteEffects';
import { useImmersiveMode } from '../hooks/useImmersiveMode';
import { useImmersiveScrollVar } from '../hooks/useImmersiveScrollVar';
import { useNavSceneTilt } from '../hooks/useNavSceneTilt';
import { FloatingAnnouncement } from './FloatingAnnouncement';
import { ImmersiveSiteHeader } from './ImmersiveSiteHeader';
import { SiteAudioBanner } from './SiteAudioBanner';
import { WhatsNewModal } from './WhatsNewModal';
import { CursorAura } from './immersive/CursorAura';

const ImmersiveBackground = lazy(() =>
  import('./immersive/ImmersiveBackground').then((m) => ({ default: m.ImmersiveBackground })),
);

export function Layout() {
  const { maintenance, blockModal, masoncordPublicUrl } = useSiteEffects();
  const masoncordHref =
    masoncordPublicUrl.trim() || import.meta.env.VITE_MASONCORD_URL?.trim() || DEFAULT_MASONCORD_PUBLIC_URL;
  const location = useLocation();
  const { showWebGL, showCursorAura, isEmbed } = useImmersiveMode();

  const isGame = location.pathname === '/game';

  useImmersiveScrollVar();
  useNavSceneTilt(!isGame && !isEmbed);

  useEffect(() => {
    if (isGame) {
      document.documentElement.classList.remove('imm-mode');
      return;
    }
    document.documentElement.classList.add('imm-mode');
    return () => document.documentElement.classList.remove('imm-mode');
  }, [isGame]);

  useEffect(() => {
    const lock = Boolean(blockModal?.enabled || maintenance) || isGame;
    document.documentElement.style.overflow = lock ? 'hidden' : '';
    document.body.style.overflow = isGame ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [blockModal?.enabled, maintenance, isGame]);

  return (
    <div className={isGame ? 'app-shell app-shell--game-fs' : 'app-shell'}>
      {!isGame && showWebGL ? (
        <div className="imm-webgl-wrap">
          <Suspense fallback={null}>
            <ImmersiveBackground />
          </Suspense>
        </div>
      ) : null}
      {!isGame && showCursorAura ? <CursorAura /> : null}

      {!isGame && (
        <>
          <ImmersiveSiteHeader />

          <FloatingAnnouncement />
          <WhatsNewModal />
        </>
      )}

      <SiteAudioBanner variant={isGame ? 'dock' : 'inline'} />

      {!isGame ? (
        <main className="main-content">
          <Outlet />
        </main>
      ) : (
        <div className="game-route-outlet">
          <Outlet />
        </div>
      )}

      {!isGame && (
        <footer className="app-footer immersive-footer">
          <div className="app-footer-inner immersive-footer-inner">
            <NavLink to="/order">Order</NavLink>
            <NavLink to="/game">Game</NavLink>
            <NavLink to="/schedule">Schedule</NavLink>
            <NavLink to="/discography">Discography</NavLink>
            <Link to={{ pathname: '/', hash: 'music' }}>Music</Link>
            <Link to={{ pathname: '/', hash: 'pricing' }}>Pricing</Link>
            <Link to={{ pathname: '/', hash: 'contact' }}>Contact</Link>
            <a href={masoncordHref} target="_blank" rel="noreferrer">
              Masoncord
            </a>
            <NavLink to="/tickets">Tickets</NavLink>
            <NavLink to="/reels">Reels</NavLink>
            <NavLink to="/session">Session chat</NavLink>
          </div>
        </footer>
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
