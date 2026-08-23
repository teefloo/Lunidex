import { getServerT } from '@/lib/server-i18n';
import HeroControls from './HeroControls';
import LunidexLogo from '@/components/ui/LunidexLogo';

export default async function PokedexHero() {
  const t = await getServerT();

  return (
    <section aria-labelledby="pokedex-title" className="pokedex-hero relative pt-6 pb-8 md:pt-10 md:pb-12">
      <div className="pokedex-hero__grid mx-auto w-full max-w-6xl px-5 md:px-8">
        <div className="pokedex-hero__copy">
          <h1 id="pokedex-title" className="page-title pokedex-hero__title font-display">
            {t('pokedex.title')}
          </h1>
          <p className="pokedex-hero__description mt-3 max-w-2xl text-base md:text-lg">
            {t('pokedex.description')}
          </p>
        </div>

        <div className="pokedex-hero__mark" aria-hidden="true">
          <span className="pokedex-hero__star pokedex-hero__star--one" />
          <span className="pokedex-hero__star pokedex-hero__star--two" />
          <span className="pokedex-hero__star pokedex-hero__star--three" />
          <div className="pokedex-hero__mark-halo" />
          <LunidexLogo
            alt=""
            priority
            sizes="(max-width: 767px) 148px, 220px"
            className="pokedex-hero__mark-image"
          />
        </div>
      </div>

      <div className="pokedex-hero__controls mx-auto w-full max-w-6xl px-5 md:px-8">
        <HeroControls />
      </div>
    </section>
  );
}
