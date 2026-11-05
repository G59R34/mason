import { NavLink } from 'react-router-dom';
import { useGlobalPlayer } from '../context/GlobalPlayerContext';
import { CustomAudioPlayer } from './CustomAudioPlayer';

type Variant = 'inline' | 'dock';

export function SiteAudioBanner({ variant }: { variant: Variant }) {
  const { activeTrack, playToken } = useGlobalPlayer();

  return (
    <div className={`audio-banner${variant === 'dock' ? ' audio-banner--dock' : ''}`}>
      <div className="audio-banner__inner">
        <div className="audio-banner__meta">
          <span className="audio-banner__label">Now playing</span>
          <span className="audio-banner__title">
            {activeTrack.title}
            <span className="audio-banner__sub"> · {activeTrack.subtitle}</span>
          </span>
        </div>
        <div className="audio-banner__player">
          <CustomAudioPlayer
            src={activeTrack.src}
            playSignal={playToken}
            aria-label={`Play ${activeTrack.title}`}
          />
        </div>
        <NavLink to="/discography" className="audio-banner__link">
          Discography
        </NavLink>
      </div>
    </div>
  );
}
