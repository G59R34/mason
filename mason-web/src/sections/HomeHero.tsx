import { Link } from 'react-router-dom';

export function HomeHero() {
  return (
    <div className="hero">
      <div className="hero__copy">
        <p className="eyebrow">Private sessions · Real talk</p>
        <h1 className="hero__title">Hello, I&apos;m Mason.</h1>
        <p className="hero__lead muted">Book a private session and I will FUCK you.</p>

        <div className="hero__actions">
          <a href="#pricing" className="btn">
            Book a session
          </a>
          <a href="#reviews" className="btn btn-ghost">
            Read reviews
          </a>
        </div>

        <dl className="hero__facts">
          <div>
            <dt>Slow replies</dt>
            <dd>Most clients hear back within a month.</dd>
          </div>
          <div>
            <dt>Foggy scheduling</dt>
            <dd>Everything is confirmed at some point.</dd>
          </div>
          <div>
            <dt>Private chat</dt>
            <dd>Secure, real-time updates on your session.</dd>
          </div>
        </dl>
      </div>

      <div className="hero__media">
        <img src="/img/mason.png" alt="Mason" />
      </div>

      <blockquote className="hero__quote">
        <p>You WILL get FUCKED</p>
        <cite>— Mason</cite>
      </blockquote>
    </div>
  );
}

/** Compact CTA strip linking to the full game experience */
export function GameTeaserSection() {
  return (
    <section className="band" aria-labelledby="game-teaser-title">
      <div className="band__copy">
        <p className="eyebrow">Arcade</p>
        <h2 id="game-teaser-title" className="band__title">
          Mason Runner
        </h2>
        <p className="muted band__lead">Full-screen arcade mode — best on desktop or landscape.</p>
      </div>
      <Link to="/game" className="btn btn-ghost">
        Play the game
      </Link>
    </section>
  );
}
