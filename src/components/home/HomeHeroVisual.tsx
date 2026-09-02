'use client';

import Image from 'next/image';
import { HomeCardPreview } from './HomeCardPreview';
import { HOME_FEATURED_CARDS } from './homeFeaturedCards';

const PIKACHU_ARTWORK = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png';

/**
 * A decorative composition built from the same real assets used throughout
 * Lunidex. It intentionally has no dashboard chrome or synthetic metrics.
 */
export function HomeHeroVisual() {
  return (
    <div className="home-hero-visual" aria-hidden="true">
      <div className="home-hero-visual-orbit home-hero-visual-orbit-one" />
      <div className="home-hero-visual-orbit home-hero-visual-orbit-two" />
      <Image
        src={PIKACHU_ARTWORK}
        alt=""
        width={420}
        height={420}
        priority
        sizes="(max-width: 767px) 47vw, 25vw"
        className="home-hero-visual-pokemon"
      />
      <div className="home-hero-visual-card home-hero-visual-card-one">
        <HomeCardPreview card={HOME_FEATURED_CARDS[0]} rotationClass="-rotate-6" sizes="(max-width: 767px) 26vw, 14vw" />
      </div>
      <div className="home-hero-visual-card home-hero-visual-card-two">
        <HomeCardPreview card={HOME_FEATURED_CARDS[1]} rotationClass="rotate-3" sizes="(max-width: 767px) 26vw, 14vw" />
      </div>
      <div className="home-hero-visual-card home-hero-visual-card-three">
        <HomeCardPreview card={HOME_FEATURED_CARDS[2]} rotationClass="rotate-8" sizes="(max-width: 767px) 26vw, 14vw" />
      </div>
    </div>
  );
}

export default HomeHeroVisual;
