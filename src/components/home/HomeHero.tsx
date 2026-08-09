import Link from 'next/link';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { HomeCollectionEntry } from './HomeCollectionEntry';

export default async function HomeHero() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);

  return (
    <section id="home-hero" data-world-chapter="threshold" aria-labelledby="home-title" className="home-chapter home-chapter-hero">
      <div className="home-hero-copy">
        <div className="home-hero-index">
          <span aria-hidden="true">01</span>
          <span>{t('lunidex_archive.hero_eyebrow')}</span>
        </div>
        <p className="home-eyebrow">Lunidex / {t('lunidex_archive.hero_eyebrow')}</p>
        <h1 id="home-title" className="home-hero-title">
          {t('lunidex_archive.hero_title')}
        </h1>
        <p className="home-hero-body">
          {t('lunidex_home.hero_body', { defaultValue: 'Your TCG collection and Pokémon teams, finally together in one simple, personal space.' })}
        </p>
        <div className="home-hero-actions">
          <HomeCollectionEntry
            locale={language}
            startLabel={t('lunidex_archive.hero_cta_primary')}
            resumeLabel={t('lunidex_home.cta_resume')}
            className="home-primary-cta"
          />
          <Link href="#collection" className="home-secondary-cta">
            {t('lunidex_archive.hero_cta_secondary')}
          </Link>
        </div>
        <p className="home-hero-note">{t('lunidex_home.start_without_account', { defaultValue: 'Start without an account.' })}</p>
      </div>
    </section>
  );
}
