import { useCallback, useEffect, useState } from 'react';
import { MasonRunnerGame } from '../components/MasonRunnerGame';
import { fetchMasonRunnerLeaderboard, submitMasonRunnerScore, type MasonRunnerRow } from '../lib/masonRunnerLeaderboard';
import { supabase } from '../lib/supabase';
import '../styles/mason-runner.css';

const NAME_KEY = 'ms_runner_display_name';

export function GamePage() {
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
    <div className="mason-runner-page">
      <section className="card mason-runner-hero">
        <h1>Mason Runner</h1>
        <p className="muted" style={{ marginBottom: 0 }}>
          Jump the cacti — speed ramps up the longer you last. Drop a Mason sprite into <code>src/assets/mason.png</code> when ready; the runner
          uses a stylized stand-in until then.
        </p>
      </section>

      <div className="mason-runner-layout">
        <div>
          <MasonRunnerGame onScoreUpdate={onScoreUpdate} onGameOver={onGameOver} />
          <p className="mason-runner-tip" style={{ marginTop: 14 }}>
            Tip: rhythm beats panic — tap early. Speed ramps up the longer you survive.
          </p>
        </div>

        <aside className="mason-runner-side card section" style={{ boxShadow: 'var(--shadow)', margin: 0 }}>
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
              Last run: <strong style={{ color: 'var(--accent-warm)' }}>{lastRun.toLocaleString()}</strong>
              {liveScore > 0 && (
                <>
                  {' '}
                  · current: {liveScore.toLocaleString()}
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
              <p className="mason-runner-lb-empty">No scores yet — be first after you run the SQL migration.</p>
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
