import Link from 'next/link';
import HomeFaqSection from '@/components/layout/HomeFaqSection';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { localeHref } from '@/lib/seo';
import HomeHeader from './HomeHeader';
import HomeHero from './HomeHero';
import HomePokedexPreview from './HomePokedexPreview';
import HomeTeamPreview from './HomeTeamPreview';
import { HomeCollectionPreview } from './HomeCollectionPreview';
import { HomeCollectionEntry } from './HomeCollectionEntry';
import { HomeWordReveal } from './HomeWordReveal';
import { LunidexWorld } from './LunidexWorld';

export default async function HomeArchiveExperience() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);

  return (
    <div className="lunidex-home">
      <HomeHeader />
      <LunidexWorld>
        <main id="home-main" className="lunidex-home-main">
          <HomeHero />

          <section
            id="collection"
            className="home-chapter home-chapter-collection"
            data-world-chapter="collection"
            aria-labelledby="collection-chapter-title"
          >
            <div className="home-chapter-copy">
              <p className="home-eyebrow">{t('lunidex_archive.collection_eyebrow')}</p>
              <h2 id="collection-chapter-title" className="home-chapter-title">
                <HomeWordReveal text={t('lunidex_archive.collection_title')} />
              </h2>
              <p className="home-chapter-body">{t('lunidex_archive.collection_body')}</p>
              <p className="home-chapter-index" aria-hidden="true">02 / 05</p>
            </div>
            <HomeCollectionPreview
              locale={language}
              copy={{
                startLabel: t('lunidex_home.cta_start'),
                resumeLabel: t('lunidex_home.cta_resume'),
                previewEyebrow: t('lunidex_home.preview_eyebrow'),
                previewTitle: t('lunidex_home.preview_title'),
                previewBody: t('lunidex_home.preview_body'),
                previewNote: t('lunidex_home.preview_note'),
                previewOwnedEyebrow: t('lunidex_home.preview_owned_eyebrow'),
                previewOwnedTitle: t('lunidex_home.preview_owned_title'),
                previewOwnedCountOne: t('lunidex_home.preview_owned_count_one'),
                previewOwnedCountOther: t('lunidex_home.preview_owned_count_other'),
                noAccount: t('lunidex_home.no_account'),
              }}
            />
          </section>

          <section
            id="pokedex"
            className="home-chapter home-chapter-pokedex"
            data-world-chapter="pokedex"
            aria-labelledby="pokedex-chapter-title"
          >
            <div className="home-chapter-visual home-chapter-visual-pokedex">
              <HomePokedexPreview />
            </div>
            <div className="home-chapter-copy">
              <p className="home-eyebrow">{t('lunidex_archive.pokedex_eyebrow')}</p>
              <h2 id="pokedex-chapter-title" className="home-chapter-title">
                <HomeWordReveal text={t('lunidex_archive.pokedex_title')} />
              </h2>
              <p className="home-chapter-body">{t('lunidex_home.tools_pokedex_body')}</p>
              <Link href={localeHref('/pokedex', language)} className="home-text-cta">
                {t('lunidex_home.cta_pokedex')}
                <span aria-hidden="true">↗</span>
              </Link>
              <p className="home-chapter-index" aria-hidden="true">03 / 05</p>
            </div>
          </section>

          <section
            id="team-builder"
            className="home-chapter home-chapter-team"
            data-world-chapter="team"
            aria-labelledby="team-chapter-title"
          >
            <div className="home-chapter-copy">
              <p className="home-eyebrow">{t('lunidex_archive.team_eyebrow')}</p>
              <h2 id="team-chapter-title" className="home-chapter-title">
                <HomeWordReveal text={t('lunidex_archive.team_title')} />
              </h2>
              <p className="home-chapter-body">{t('lunidex_home.tools_team_body')}</p>
              <Link href={localeHref('/team', language)} className="home-text-cta">
                {t('lunidex_archive.team_title')}
                <span aria-hidden="true">↗</span>
              </Link>
              <p className="home-chapter-index" aria-hidden="true">04 / 05</p>
            </div>
            <div className="home-chapter-visual home-chapter-visual-team">
              <HomeTeamPreview />
            </div>
          </section>

          <section
            id="departure"
            className="home-chapter home-chapter-departure"
            data-world-chapter="departure"
            aria-labelledby="departure-title"
          >
            <div className="home-departure-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="home-departure-copy">
              <p className="home-eyebrow">{t('lunidex_archive.final_eyebrow')}</p>
              <h2 id="departure-title" className="home-departure-title">
                <HomeWordReveal text={t('lunidex_archive.final_title')} />
              </h2>
              <p className="home-chapter-body">{t('lunidex_archive.final_body')}</p>
              <HomeCollectionEntry
                locale={language}
                startLabel={t('lunidex_archive.hero_cta_primary')}
                resumeLabel={t('lunidex_home.cta_resume')}
                className="home-primary-cta"
              />
            </div>
          </section>
        </main>
      </LunidexWorld>

      <div className="home-faq-wrap">
        <HomeFaqSection />
      </div>
    </div>
  );
}
