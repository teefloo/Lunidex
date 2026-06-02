import { getServerT } from '@/lib/server-i18n';
import HeroControls from '@/components/pokemon/HeroControls';

export default async function HeroSection() {
  const t = await getServerT();
  return (
    <section className="pt-8 pb-8">
      <div
        className="page-shell page-surface relative z-10 overflow-hidden px-5 py-8 md:px-8 md:py-10"
      >
        <div className="mx-auto max-w-5xl text-center">
          <h1
            className="mx-auto max-w-4xl text-5xl font-black leading-[0.98] md:text-7xl lg:text-[5.8rem]"
          >
            <span className="gradient-text-hero">
              {t('home.hero_title')}
            </span>
          </h1>
          <p className="page-subtitle mx-auto mt-4 max-w-2xl">
            {t('home.hero_subtitle')}
          </p>
        </div>

        <HeroControls />
      </div>
    </section>
  );
}
