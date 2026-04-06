import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MasonRunnerGame } from '../components/MasonRunnerGame';
import { fetchMasonRunnerLeaderboard, submitMasonRunnerScore, type MasonRunnerRow } from '../lib/masonRunnerLeaderboard';
import { supabase } from '../lib/supabase';
import '../styles/mason-runner.css';

const NAME_KEY = 'ms_runner_display_name';

export function GamePage() {
  const fsRef = useRef<HTMLDivElement>(null);
  const [fsActive, setFsActive] = useState(false);
  const [liveScore, setLiveScore] = useState(0);
  const [lastRun, setLastRun] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [rows, setRows] = useState<MasonRunnerRow[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [lbError, setLbError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(NAME_KEY);
      if (s) setPlayerName(s);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFsActive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleBrowserFullscreen = useCallback(() => {
    const el = fsRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.().catch(() => {});
    } else {
      void document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const loadBoard = useCallback(async () => {
    setLbLoading(true);
    setLbError(null);
    const { rows: data, error } = await fetchMasonRunnerLeaderboard(30);
    if (error) {
      setLbError(error.message || 'Could not load leaderboard');
      setRows([]);
    } else {
      setRows(data);
    }
    setLbLoading(false);
  }, []);

  useEffect(() => {
    loadBoard();
    const ch = supabase
      .channel('mason_runner_lb')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mason_runner_scores' }, () => loadBoard())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadBoard]);

  const onGameOver = useCallback((score: number) => {
    setLastRun(score);
  }, []);

  const onScoreUpdate = useCallback((score: number) => {
    setLiveScore(score);
  }, []);

  async function submitScore() {
    const name = playerName.trim();
    if (!name) {
      setSubmitStatus('Add your name first');
      return;
    }
    if (lastRun <= 0) {
      setSubmitStatus('Play a run to submit a score');
      return;
    }
    setSubmitting(true);
    setSubmitStatus(null);
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      /* ignore */
    }
    const { error } = await submitMasonRunnerScore(name, lastRun);
    if (error) {
      setSubmitStatus(error.message || 'Submit failed — run add_mason_runner_scores.sql in Supabase?');
    } else {
      setSubmitStatus('Score posted to the global board');
      await loadBoard();
    }
    setSubmitting(false);
  }

  return (
    <div className="mason-runner-fs" ref={fsRef}>
      <header className="mason-runner-fs-bar">
        <Link to="/" className="mason-runner-fs-back">
          ← Site
        </Link>
        <span className="mason-runner-fs-title">Mason Runner</span>
        <button type="button" className="mason-runner-fs-fsbtn" onClick={toggleBrowserFullscreen}>
          {fsActive ? 'Exit fullscreen' : 'Fullscreen'}
        </button>
      </header>

      <div className="mason-runner-fs-main">
        <div className="mason-runner-fs-play">
          <MasonRunnerGame onScoreUpdate={onScoreUpdate} onGameOver={onGameOver} />
          <p className="mason-runner-tip mason-runner-tip--fs">Space · tap · click to jump · speed increases over time</p>
        </div>

        <aside className="mason-runner-side card section mason-runner-side--fs">
          <div className="mason-runner-name">
            <label htmlFor="runner-name">Your name on the board</label>
            <input
              id="runner-name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. DinoSlayer"
              maxLength={32}
              autoComplete="nickname"
            />
          </div>

          <div className="mason-runner-submit-row">
            <button type="button" className="btn" disabled={submitting || lastRun <= 0} onClick={() => void submitScore()}>
              {submitting ? 'Posting…' : 'Submit last run'}
            </button>
            <span className="muted" style={{ fontSize: '0.9rem' }}>
              Last: <strong style={{ color: 'var(--accent-warm)' }}>{lastRun.toLocaleString()}</strong>
              {liveScore > 0 && (
                <>
                  {' '}
                  · now {liveScore.toLocaleString()}
                </>
              )}
            </span>
          </div>
          {submitStatus && <p className="mason-runner-submit-note">{submitStatus}</p>}

          <div className="mason-runner-leaderboard">
            <div className="mason-runner-lb-head">
              <span>Global leaderboard</span>
              {lbLoading && <span className="muted" style={{ fontSize: '0.82rem' }}>Loading…</span>}
            </div>
            {lbError && (
              <p className="mason-runner-lb-empty" style={{ color: '#f87171' }}>
                {lbError}
              </p>
            )}
            {!lbError && rows.length === 0 && !lbLoading && (
              <p className="mason-runner-lb-empty">No scores yet — run the SQL migration in Supabase.</p>
            )}
            <div className="mason-runner-lb-rows">
              {rows.map((r, i) => (
                <div key={r.id} className="mason-runner-lb-row">
                  <span className="mason-runner-lb-rank">{i + 1}</span>
                  <span className="mason-runner-lb-name" title={r.player_name}>
                    {r.player_name}
                  </span>
                  <span className="mason-runner-lb-score">{r.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
