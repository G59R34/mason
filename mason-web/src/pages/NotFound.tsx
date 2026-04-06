import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section className="card section">
      <h1>Page not found</h1>
      <p className="muted">That route does not exist.</p>
      <Link to="/" className="btn" style={{ marginTop: 16, display: 'inline-flex' }}>
        Back home
      </Link>
    </section>
  );
}
