import { getServerT } from '@/lib/server-i18n';
import HeroControls from '@/components/pokemon/HeroControls';

export default async function HeroSection() {
  const t = await getServerT();
  const eyebrow = t('home.hero_eyebrow', { defaultValue: 'Chapter I — Field Compendium' });
  const caption = t('home.hero_caption', { defaultValue: 'A naturalist’s index of the known Pokémon, with type, region, and stat profiles for every recorded specimen.' });

  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative pt-6 pb-10 md:pt-10 md:pb-14"
    >
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <div className="grid grid-cols-12 gap-x-6 gap-y-8 items-start">
          <div className="col-span-12 md:col-span-2 flex md:flex-col items-start gap-4 md:pt-3">
            <span className="cat-no text-[0.7rem] tracking-[0.32em] text-muted-foreground/80">
              No. 0001
            </span>
            <span aria-hidden="true" className="hidden md:block h-12 w-px bg-gradient-to-b from-foreground/30 to-transparent" />
          </div>

          <div className="col-span-12 md:col-span-7 flex flex-col gap-5">
            <p className="page-eyebrow flex items-center gap-3 text-muted-foreground/90">
              <span aria-hidden="true" className="h-px w-8 bg-current opacity-60" />
              <span>{eyebrow}</span>
            </p>

            <h1
              id="hero-title"
              className="page-title font-display tracking-[-0.01em] text-foreground"
              style={{ fontVariationSettings: '"opsz" 144' }}
            >
              <span className="block text-[clamp(2.75rem,9vw,6.5rem)] leading-[0.92] font-extrabold gradient-text-hero">
                {t('home.hero_title')}
              </span>
              <span className="mt-2 block text-[clamp(1.5rem,4.5vw,3rem)] leading-[0.95] font-display font-medium italic editorial-italic text-foreground/80">
                — a field compendium
              </span>
            </h1>

            <div className="rule-line mt-2 max-w-md" aria-hidden="true" />

            <p className="page-subtitle text-base md:text-lg text-foreground/75 max-w-xl">
              {t('home.hero_subtitle')}
            </p>
            <p className="text-sm md:text-[0.95rem] leading-relaxed text-muted-foreground max-w-xl">
              {caption}
            </p>
          </div>

          <aside className="col-span-12 md:col-span-3 flex md:flex-col items-start md:items-end gap-3 md:pt-2">
            <div className="field-stamp hidden md:flex" aria-hidden="true">
              <span>Field Notes</span>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1.5 text-right">
              <span className="cat-no text-[0.65rem]">Vol. I</span>
              <span className="cat-no text-[0.65rem]">Edition MMXXVI</span>
              <span className="cat-no text-[0.65rem] text-muted-foreground/70">Compiled 06·03·2026</span>
            </div>
            <div className="editorial-ornament md:mt-1" aria-hidden="true">
              <svg viewBox="0 0 80 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-auto text-foreground/40">
                <path d="M0 12 H30" stroke="currentColor" strokeWidth="0.6" />
                <path d="M40 12 C44 6 50 6 50 12 C50 18 56 18 60 12" stroke="currentColor" strokeWidth="0.8" fill="none" />
                <circle cx="50" cy="12" r="1.4" fill="currentColor" />
                <path d="M50 12 H80" stroke="currentColor" strokeWidth="0.6" />
              </svg>
            </div>
          </aside>
        </div>

        <div className="mt-10 md:mt-14">
          <HeroControls />
        </div>
      </div>
    </section>
  );
}
