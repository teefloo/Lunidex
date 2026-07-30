import { getServerT } from '@/lib/server-i18n';
import HeroControls from './HeroControls';

export default async function PokedexHero() {
  const t = await getServerT();

  return (
    <section aria-labelledby="pokedex-title" className="relative pt-6 pb-8 md:pt-10 md:pb-12">
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <h1 id="pokedex-title" className="page-title font-display tracking-[-0.01em] text-foreground">
          <span className="block font-display text-[clamp(2.75rem,9vw,6.5rem)] leading-[0.92] font-extrabold gradient-text-hero">
            {t('pokedex.title')}
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
          {t('pokedex.description')}
        </p>
        <div className="mt-8 md:mt-10">
          <HeroControls />
        </div>
      </div>
    </section>
  );
}
