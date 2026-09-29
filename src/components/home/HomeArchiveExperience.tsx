import Link from 'next/link';
import HomeFaqSection from '@/components/layout/HomeFaqSection';
import { getTCGSetCardsCached } from '@/lib/api/server-cache';
import { isNeonConfiguredServer } from '@/lib/neon/server';
import { getServerAuthUser } from '@/lib/neon/auth';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { localeHref } from '@/lib/seo';
import { GITHUB_REPO_URL } from '@/lib/site';
import { DEFAULT_LATEST_TCG_SET } from '@/lib/tcg-default-latest-set';
import { getCardMarketValue, getRarityWeight } from '@/lib/tcg-collection';
import { hasTCGCardImage } from '@/lib/tcg-images';
import { HomeCollectionEntry } from './HomeCollectionEntry';
import HomeCatalogPreview from './HomeCatalogPreview';
import HomeCollectionSteps from './HomeCollectionSteps';
import HomeHeader from './HomeHeader';
import HomePokedexPreview from './HomePokedexPreview';
import HomeTeamPreview from './HomeTeamPreview';

export async function HomeArchiveExperience() {
  const [t, language, serverUser, initialCatalog] = await Promise.all([
    getServerT(),
    getServerLanguage(),
    getServerAuthUser(),
    getTCGSetCardsCached(DEFAULT_LATEST_TCG_SET.id, 'en').catch(() => null),
  ]);
  const initialSignedIn = Boolean(serverUser);
  const collectionServiceAvailable = Boolean(
    process.env.NEXT_PUBLIC_NEON_AUTH_URL
      && process.env.NEON_AUTH_BASE_URL
      && process.env.NEON_AUTH_JWKS_URL
      && process.env.NEON_AUTH_COOKIE_SECRET
      && isNeonConfiguredServer,
  );
  const previewCards = [...(initialCatalog ?? [])]
    .filter(hasTCGCardImage)
    .sort((left, right) => {
      const leftValue = getCardMarketValue(left, 'EUR')?.amount ?? 0;
      const rightValue = getCardMarketValue(right, 'EUR')?.amount ?? 0;
      if (leftValue !== rightValue) return rightValue - leftValue;
      const rarityDifference = getRarityWeight(right.rarity) - getRarityWeight(left.rarity);
      return rarityDifference || left.id.localeCompare(right.id, undefined, { numeric: true, sensitivity: 'base' });
    })
    .slice(0, 3);

  return (
    <div className="lunidex-home">
      <HomeHeader initialSignedIn={initialSignedIn} serviceAvailable={collectionServiceAvailable} />
      <main id="home-main" tabIndex={-1} className="home-landing-main">
        <section id="threshold" className="home-landing-hero" aria-labelledby="home-hero-title">
          <div className="home-landing-hero-copy">
            <p className="home-section-kicker">{t('lunidex_home.hero_eyebrow')}</p>
            <h1 id="home-hero-title" className="home-landing-hero-title">
              {t('lunidex_home.hero_title')}
            </h1>
            <p className="home-landing-hero-body">{t('lunidex_home.hero_body')}</p>
            <div className="home-landing-hero-actions">
              <Link href={localeHref('/tcg', language)} className="home-primary-cta">
                {t('lunidex_home.cta_explore_cards')}
                <span aria-hidden="true">↗</span>
              </Link>
              <HomeCollectionEntry
                locale={language}
                startLabel={t('lunidex_home.cta_start')}
                resumeLabel={t('lunidex_home.cta_resume')}
                unavailableLabel={t('lunidex_home.cta_collection_info')}
                className="home-secondary-cta"
                initialSignedIn={initialSignedIn}
                serviceAvailable={collectionServiceAvailable}
              />
            </div>
          </div>
          <HomeCatalogPreview
            cards={previewCards}
            defaultSetId={DEFAULT_LATEST_TCG_SET.id}
            defaultSetName={DEFAULT_LATEST_TCG_SET.name}
          />
        </section>

        <HomeCollectionSteps />

        <section id="tools" className="home-tools-section" aria-labelledby="home-tools-title">
          <div className="home-section-heading">
            <div>
              <p className="home-section-kicker">{t('lunidex_home.tools_eyebrow')}</p>
              <h2 id="home-tools-title">{t('lunidex_home.tools_title')}</h2>
            </div>
            <p>{t('lunidex_home.tools_body')}</p>
          </div>
          <div className="home-tools-grid">
            <article id="pokedex" className="home-tool-card" aria-labelledby="home-pokedex-title">
              <h3 id="home-pokedex-title" className="sr-only">{t('lunidex_home.tools_pokedex_title')}</h3>
              <HomePokedexPreview />
            </article>
            <article id="team" className="home-tool-card" aria-labelledby="home-team-title">
              <h3 id="home-team-title" className="sr-only">{t('lunidex_home.tools_team_title')}</h3>
              <HomeTeamPreview />
            </article>
          </div>
        </section>

        <section id="collection-access" className="home-local-first" aria-labelledby="home-local-first-title">
          <div className="home-local-first-copy">
            <p className="home-section-kicker">{t('lunidex_home.access_eyebrow')}</p>
            <h2 id="home-local-first-title">{t('lunidex_home.access_title')}</h2>
            <p>{t('lunidex_home.trust_body')}</p>
            <p className="home-local-first-independent">{t('lunidex_home.independent')}</p>
            <div className="home-support-actions">
              <HomeCollectionEntry
                locale={language}
                startLabel={t('lunidex_home.cta_start')}
                resumeLabel={t('lunidex_home.cta_resume')}
                unavailableLabel={t('lunidex_home.cta_collection_info')}
                className="home-secondary-cta"
                initialSignedIn={initialSignedIn}
                serviceAvailable={collectionServiceAvailable}
              />
              <Link href={localeHref('/about', language)} className="home-inline-link">
                {t('lunidex_home.about')}
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>

          <article id="open-source" className="home-open-source" aria-labelledby="home-open-source-title">
            <h2 id="home-open-source-title">{t('about.opensource_title')}</h2>
            <p>{t('about.cards.github')}</p>
            <p>{t('about.opensource_body').split('\n')[0]}</p>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className="home-primary-cta">
              {t('footer.resources.github')}
              <span aria-hidden="true">↗</span>
            </a>
          </article>
        </section>

        <HomeFaqSection />

        <section className="home-final-cta" aria-labelledby="home-final-cta-title">
          <div>
            <p className="home-section-kicker">{t('lunidex_home.final_eyebrow')}</p>
            <h2 id="home-final-cta-title">{t('lunidex_home.final_title')}</h2>
            <p>{t('lunidex_home.final_body')}</p>
            <div className="home-landing-hero-actions">
              <Link href={localeHref('/tcg', language)} className="home-primary-cta">
                {t('lunidex_home.cta_explore_cards')}
                <span aria-hidden="true">↗</span>
              </Link>
              <HomeCollectionEntry
                locale={language}
                startLabel={t('lunidex_home.cta_start')}
                resumeLabel={t('lunidex_home.cta_resume')}
                unavailableLabel={t('lunidex_home.cta_collection_info')}
                className="home-secondary-cta"
                initialSignedIn={initialSignedIn}
                serviceAvailable={collectionServiceAvailable}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomeArchiveExperience;
