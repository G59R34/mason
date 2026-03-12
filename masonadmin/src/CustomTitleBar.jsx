import React, { useEffect, useState } from 'react';

export default function CustomTitleBar() {
  const [maximized, setMaximized] = useState(false);
  const api = window.electronAPI;

  useEffect(() => {
    if (!api) return;
    api.onMaximized(setMaximized);
    api.onUnmaximized(() => setMaximized(false));
  }, [api]);

  if (!api) return null;

  return (
    <header className="electron-title-bar" data-electron-drag>
      <div className="electron-title-bar__gradient" aria-hidden="true" />
      <div className="electron-title-bar__glow" aria-hidden="true" />
      <div className="electron-title-bar__inner">
        <div className="electron-title-bar__brand">
          <span className="electron-title-bar__logo">M</span>
          <span className="electron-title-bar__title">Sex With Mason Admin</span>
        </div>
        <div className="electron-title-bar__controls">
          <button
            type="button"
            className="electron-title-bar__btn electron-title-bar__btn--min"
            onClick={() => api.minimize()}
            aria-label="Minimize"
          />
          <button
            type="button"
            className={`electron-title-bar__btn electron-title-bar__btn--max ${maximized ? 'is-maximized' : ''}`}
            onClick={() => api.maximize()}
            aria-label={maximized ? 'Restore' : 'Maximize'}
          />
          <button
            type="button"
            className="electron-title-bar__btn electron-title-bar__btn--close"
            onClick={() => api.close()}
            aria-label="Close"
          />
        </div>
      </div>
    </header>
  );
}
