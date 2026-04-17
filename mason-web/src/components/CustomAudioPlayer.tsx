import { useCallback, useEffect, useRef, useState } from 'react';

const VOLUME_STORAGE_KEY = 'mason_audio_volume';

function readStoredVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw == null) return 1;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return 1;
    return Math.max(0, Math.min(1, n));
  } catch {
    return 1;
  }
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

type Props = {
  src: string;
  'aria-label'?: string;
  /**
   * When this number increases (e.g. user chose a track in the global queue), load `src` if needed and start playback.
   * `0` means “no programmatic play yet” (avoids autoplay on first paint).
   */
  playSignal?: number;
};

export function CustomAudioPlayer({ src, playSignal = 0, 'aria-label': ariaLabel }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pct, setPct] = useState(0);
  const [volume, setVolume] = useState(() => readStoredVolume());
  const volumeRef = useRef(volume);

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
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setPct(0);
    a.pause();
    a.src = src;
    void a.load();
    a.volume = volumeRef.current;
  }, [src]);

  useEffect(() => {
    volumeRef.current = volume;
    const a = audioRef.current;
    if (a) a.volume = volume;
  }, [volume]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onMeta = () => {
      setDuration(a.duration || 0);
      tick();
    };
    const onEnded = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener('timeupdate', tick);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnded);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    return () => {
      a.removeEventListener('timeupdate', tick);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
    };
  }, [tick, src]);

  useEffect(() => {
    if (!playSignal) return;
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    const tryPlay = () => void a.play().catch(() => {});
    if (a.readyState >= 2) tryPlay();
    else {
      const onReady = () => {
        a.removeEventListener('canplay', onReady);
        tryPlay();
      };
      a.addEventListener('canplay', onReady);
      return () => a.removeEventListener('canplay', onReady);
    }
  }, [playSignal]);

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
      <audio ref={audioRef} className="custom-audio-native" preload="metadata" crossOrigin="anonymous" />
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
      <label className="custom-audio-volume">
        <span className="visually-hidden">Volume</span>
        <span className="custom-audio-volume-icon" aria-hidden>
          {volume === 0 ? '🔇' : volume < 0.45 ? '🔉' : '🔊'}
        </span>
        <input
          type="range"
          className="custom-audio-volume-input"
          min={0}
          max={1}
          step={0.02}
          value={volume}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(volume * 100)}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            try {
              localStorage.setItem(VOLUME_STORAGE_KEY, String(v));
            } catch {
              /* ignore quota / private mode */
            }
          }}
        />
      </label>
    </div>
  );
}
