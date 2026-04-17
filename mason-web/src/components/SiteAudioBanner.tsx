import { NavLink } from 'react-router-dom';
import { useGlobalPlayer } from '../context/GlobalPlayerContext';
import { CustomAudioPlayer } from './CustomAudioPlayer';

type Variant = 'inline' | 'dock';

export function SiteAudioBanner({ variant }: { variant: Variant }) {
  const { activeTrack, playToken } = useGlobalPlayer();
  const title = `${activeTrack.title} — ${activeTrack.subtitle}`;

  return (
    <div className={`audio-banner${variant === 'dock' ? ' audio-banner--dock' : ''}`}>
      <div className="audio-banner-inner">
        <div className="audio-banner-title">{title}</div>
        <div className="audio-banner-player">
          <CustomAudioPlayer
            src={activeTrack.src}
            playSignal={playToken}
            aria-label={`Play ${activeTrack.title}`}
          />
        </div>
        <NavLink to="/discography" className="btn btn-ghost audio-banner-cta">
          Browse discography
        </NavLink>
      </div>
    </div>
  );
}
