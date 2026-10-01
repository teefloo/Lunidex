import { getServerT } from '@/lib/server-i18n';
import HeroControls from './HeroControls';

export default async function PokedexHero() {
  const t = await getServerT();

  return (
    <section aria-labelledby="pokedex-title" className="mx-auto w-full max-w-6xl px-4 pb-5 pt-4 sm:px-6">
      <div className="mb-4">
        <h1 id="pokedex-title" className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
          {t('pokedex.title')}
        </h1>
      </div>
      <HeroControls />
      <p className="mt-3 max-w-3xl text-xs leading-5 text-foreground/50 sm:text-sm">
        {t('pokedex.description')}
      </p>
    </section>
  );
}
