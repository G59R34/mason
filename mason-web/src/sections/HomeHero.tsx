import { Link } from 'react-router-dom';
import { Reveal, RevealItem, RevealStagger } from '../components/Reveal';

export function HomeHero() {
  return (
    <div className="home-hero-wrap">
      <Reveal>
        <section className="card hero home-hero-card">
          <div>
            <p className="home-hero-eyebrow">Private sessions · Real talk</p>
            <h1 className="home-hero-title">Hello, I&apos;m Mason.</h1>
            <p className="muted home-hero-lead">
              Book a private session and I will FUCK you.
            </p>
            <div className="home-hero-actions">
              <a href="#pricing" className="btn">
                Book a session
              </a>
              <a href="#reviews" className="btn btn-ghost">
                See reviews
              </a>
              <a href="#forums" className="btn btn-ghost">
                Open forums
              </a>
            </div>
            <RevealStagger className="stat-grid">
              <RevealItem>
                <div className="stat-card">
                  <strong>Slow replies</strong>
                  Most clients hear back within a month.
                </div>
              </RevealItem>
              <RevealItem>
                <div className="stat-card">
                  <strong>Foggy Inconsistent scheduling</strong>
                  Everything is confirmed at some point.
                </div>
              </RevealItem>
              <RevealItem>
                <div className="stat-card">
                  <strong>Private chat</strong>
                  Secure, real-time updates on you FUCK session.
                </div>
              </RevealItem>
            </RevealStagger>
          </div>
          <div className="hero-media home-hero-media">
            <img src="/img/mason.png" alt="Mason" />
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.08}>
        <section className="card section home-quote-card">
          <div className="section-head">
            <h2 className="section-title-line">From Mason</h2>
          </div>
          <blockquote className="quote home-quote">You WILL get FUCKED</blockquote>
        </section>
      </Reveal>
    </div>
  );
}

/** Compact CTA strip linking to the full game experience */
export function GameTeaserSection() {
  return (
    <Reveal>
      <section className="game-teaser" aria-labelledby="game-teaser-title">
        <div className="game-teaser-inner">
          <div>
            <h2 id="game-teaser-title" className="game-teaser-title">
              Mason Runner
            </h2>
            <p className="muted game-teaser-copy">Full-screen arcade mode — best on desktop or landscape.</p>
          </div>
          <Link to="/game" className="btn game-teaser-btn">
            Play the game
          </Link>
        </div>
      </section>
    </Reveal>
  );
}
