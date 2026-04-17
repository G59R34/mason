import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type SiteTrack = {
  id: string;
  title: string;
  subtitle: string;
  src: string;
};

export const DEFAULT_SITE_TRACK: SiteTrack = {
  id: 'nutforme-local',
  title: 'Nut For Me',
  subtitle: 'PEGGER Productions',
  src: '/nutforme.mp3',
};

type GlobalPlayerContextValue = {
  activeTrack: SiteTrack;
  /** Increments when a track should start (or restart) playback from a user gesture. */
  playToken: number;
  playTrack: (track: SiteTrack) => void;
  isActiveTrackId: (id: string) => boolean;
};

const GlobalPlayerContext = createContext<GlobalPlayerContextValue | null>(null);

export function GlobalPlayerProvider({ children }: { children: ReactNode }) {
  const [activeTrack, setActiveTrack] = useState<SiteTrack>(DEFAULT_SITE_TRACK);
  const [playToken, setPlayToken] = useState(0);

  const playTrack = useCallback((track: SiteTrack) => {
    setActiveTrack((prev) => (prev.id === track.id && prev.src === track.src ? prev : track));
    setPlayToken((t) => t + 1);
  }, []);

  const isActiveTrackId = useCallback(
    (id: string) => activeTrack.id === id,
    [activeTrack.id]
  );

  const value = useMemo(
    () => ({
      activeTrack,
      playToken,
      playTrack,
      isActiveTrackId,
    }),
    [activeTrack, playToken, playTrack, isActiveTrackId]
  );

  return <GlobalPlayerContext.Provider value={value}>{children}</GlobalPlayerContext.Provider>;
}

export function useGlobalPlayer() {
  const ctx = useContext(GlobalPlayerContext);
  if (!ctx) {
    throw new Error('useGlobalPlayer must be used within GlobalPlayerProvider');
  }
  return ctx;
}
