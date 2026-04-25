import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type Platform = 'darwin' | 'win32' | 'linux' | 'web';

export function DesktopWindowFrame({ children }: Props) {
  const api = window.desktopWindow;
  const isDesktop = Boolean(api?.isDesktop);
  const [platform, setPlatform] = useState<Platform>('web');
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!api) return;
    let mounted = true;

    void api.getPlatform().then((value) => {
      if (!mounted) return;
      setPlatform(value);
    });

    void api.getIsMaximized().then((value) => {
      if (!mounted) return;
      setIsMaximized(value);
    });

    const unsubscribe = api.onMaximizedChange((value) => {
      setIsMaximized(value);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [api]);

  const rootClass = useMemo(() => {
    if (!isDesktop) return '';
    return `desktop-shell desktop-shell--${platform}${isMaximized ? ' is-maximized' : ''}`;
  }, [isDesktop, platform, isMaximized]);

  if (!isDesktop) return <>{children}</>;

  const showWindowsControls = platform !== 'darwin';
  const showMacInset = platform === 'darwin';

  return (
    <div className={rootClass}>
      <header className="desktop-titlebar" aria-hidden>
        {showMacInset ? <div className="desktop-titlebar__mac-spacer" /> : null}
        <div className="desktop-titlebar__drag-region" />
        {showWindowsControls ? (
          <div className="desktop-titlebar__controls">
            <button type="button" className="desktop-btn desktop-btn--min" onClick={() => api?.minimize()} aria-label="Minimize window">
              <span />
            </button>
            <button
              type="button"
              className="desktop-btn desktop-btn--max"
              onClick={() => api?.maximize()}
              aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
            >
              <span />
            </button>
            <button type="button" className="desktop-btn desktop-btn--close" onClick={() => api?.close()} aria-label="Close window">
              <span />
            </button>
          </div>
        ) : null}
      </header>
      <div className="desktop-shell__content">{children}</div>
    </div>
  );
}
