import { useHashScroll } from '../hooks/useHashScroll';
import { Reveal } from '../components/Reveal';
import { HomeHero, GameTeaserSection } from '../sections/HomeHero';
import { GalleryPage } from './GalleryPage';
import { WhyPage } from './WhyPage';
import { ReviewsPage } from './ReviewsPage';
import { ForumsPage } from './ForumsPage';
import { Pricing } from './Pricing';
import { ContactPage } from './ContactPage';
import { NutForMePage } from './NutForMePage';

export function SiteOnePage() {
  useHashScroll();

  return (
    <div className="imm-cube-viewport">
      <div className="imm-cube-face imm-cube-face--content">
        <div className="site-one-page imm-one-page imm-cube-sections">
          <section id="top" className="site-section site-section--hero">
            <HomeHero />
          </section>

          <section id="gallery" className="site-section">
            <Reveal>
              <GalleryPage />
            </Reveal>
          </section>

          <section id="game" className="site-section">
            <GameTeaserSection />
          </section>

          <section id="about" className="site-section">
            <Reveal>
              <WhyPage />
            </Reveal>
          </section>

          <section id="reviews" className="site-section">
            <Reveal>
              <ReviewsPage />
            </Reveal>
          </section>

          <section id="forums" className="site-section">
            <Reveal>
              <ForumsPage />
            </Reveal>
          </section>

          <section id="pricing" className="site-section">
            <Reveal>
              <Pricing />
            </Reveal>
          </section>

          <section id="contact" className="site-section">
            <Reveal>
              <ContactPage />
            </Reveal>
          </section>

          <section id="music" className="site-section site-section--last">
            <Reveal>
              <NutForMePage />
            </Reveal>
          </section>
        </div>
      </div>
    </div>
  );
}
