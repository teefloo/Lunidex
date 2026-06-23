import { getServerT } from '@/lib/server-i18n';
import HeroControls from '@/components/pokemon/HeroControls';

export default async function HeroSection() {
  const t = await getServerT();
  const description = t('home.hero_subtitle', { defaultValue: 'The Ultimate Pokémon Companion' });

  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative pt-6 pb-8 md:pt-10 md:pb-12"
    >
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <h1
          id="hero-title"
          className="page-title font-display tracking-[-0.01em] text-foreground"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          <span className="block font-display text-[clamp(2.75rem,9vw,6.5rem)] leading-[0.92] font-extrabold gradient-text-hero">
            {t('home.hero_title')}
          </span>
        </h1>
        <p className="mt-3 text-base md:text-lg text-foreground/70 max-w-2xl">
          {description}
        </p>

        <div className="mt-8 md:mt-10">
          <HeroControls />
        </div>
      </div>
    </section>
  );
}
