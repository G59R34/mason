import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useMainSiteUrl } from '../hooks/useMainSiteUrl';

export function LoginPage() {
  const mainSiteUrl = useMainSiteUrl();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mc-login">
      <div className="mc-login-card">
        <div className="mc-login-brand">
          <span className="mc-login-logo" aria-hidden>
            💜
          </span>
          <h1>Masoncord</h1>
          <p className="mc-login-tagline">Chat for people who know what they signed up for.</p>
        </div>
        <form className="mc-login-form" onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          {error && <p className="mc-login-error">{error}</p>}
          <button type="submit" className="mc-btn mc-btn-primary" disabled={busy}>
            {busy ? '…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="mc-login-toggle">
          <button type="button" className="mc-link" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
          </button>
        </p>
        <a className="mc-site-link" href={mainSiteUrl}>
          ← Back to main site
        </a>
      </div>
    </div>
  );
}
