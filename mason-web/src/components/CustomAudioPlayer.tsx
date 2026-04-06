import { useCallback, useEffect, useRef, useState } from 'react';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

type Props = { src: string; 'aria-label'?: string };

export function CustomAudioPlayer({ src, 'aria-label': ariaLabel }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pct, setPct] = useState(0);

  const tick = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setCurrent(a.currentTime);
    const d = a.duration;
    setPct(d > 0 && Number.isFinite(d) ? (100 * a.currentTime) / d : 0);
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onMeta = () => {
      setDuration(a.duration || 0);
      tick();
    };
    a.addEventListener('timeupdate', tick);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', () => setPlaying(false));
    a.addEventListener('play', () => setPlaying(true));
    a.addEventListener('pause', () => setPlaying(false));
    return () => {
      a.removeEventListener('timeupdate', tick);
      a.removeEventListener('loadedmetadata', onMeta);
    };
  }, [tick]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => {});
    else a.pause();
  };

  const seekFromClientX = (clientX: number, el: HTMLElement) => {
    const a = audioRef.current;
    if (!a || !Number.isFinite(a.duration)) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const p = Math.max(0, Math.min(1, x / rect.width));
    a.currentTime = p * a.duration;
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    seekFromClientX(e.clientX, e.currentTarget);
  };

  const seekTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.changedTouches[0];
    if (t) seekFromClientX(t.clientX, e.currentTarget);
  };

  return (
    <div className="custom-audio-ui">
      <audio ref={audioRef} className="custom-audio-native" preload="metadata" src={src} crossOrigin="anonymous" />
      <button type="button" className="custom-audio-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? '❚❚' : '▶'}
      </button>
      <div
        className="custom-audio-progress-outer"
        onClick={seek}
        onTouchEnd={(e) => {
          e.preventDefault();
          seekTouch(e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') seek(e as unknown as React.MouseEvent<HTMLDivElement>);
        }}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel || 'Seek'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div className="custom-audio-progress-wrap">
          <div className="custom-audio-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="custom-audio-time">
        {formatTime(current)} / {formatTime(duration)}
      </div>
    </div>
  );
}
