import Link from 'next/link';
import HomeFaqSection from '@/components/layout/HomeFaqSection';
import LunidexLogo from '@/components/ui/LunidexLogo';
import { getServerAuthUser } from '@/lib/neon/auth';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { localeHref } from '@/lib/seo';
import { GITHUB_REPO_URL } from '@/lib/site';
import { HomeCollectionEntry } from './HomeCollectionEntry';
import { HomeCollectionPreview } from './HomeCollectionPreview';
import HomeCollectionSteps from './HomeCollectionSteps';
import HomeHeroVisual from './HomeHeroVisual';
import HomeHeader from './HomeHeader';
import { HomeMotionSection } from './HomeMotionSection';
import HomePokedexPreview from './HomePokedexPreview';
import HomeTeamPreview from './HomeTeamPreview';
import { HomeWordReveal } from './HomeWordReveal';

export async function HomeArchiveExperience() {
  const [t, language, serverUser] = await Promise.all([getServerT(), getServerLanguage(), getServerAuthUser()]);
  const initialSignedIn = Boolean(serverUser);

  const collectionCopy = {
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
  };

  return (
    <div className="lunidex-home">
      <HomeHeader initialSignedIn={initialSignedIn} />
      <main id="home-main" tabIndex={-1} className="home-landing-main">
        <section id="threshold" className="home-landing-hero" aria-labelledby="home-hero-title">
          <div className="home-landing-hero-copy">
            <p className="home-section-kicker">{t('lunidex_archive.hero_eyebrow')}</p>
            <h1 id="home-hero-title" className="home-landing-hero-title">
              <HomeWordReveal text={t('lunidex_home.hero_title')} locale={language} />
            </h1>
            <p className="home-landing-hero-body">{t('lunidex_home.hero_body')}</p>
            <div className="home-landing-hero-actions">
              <HomeCollectionEntry
                locale={language}
                startLabel={t('lunidex_home.cta_start')}
                resumeLabel={t('lunidex_home.cta_resume')}
                className="home-primary-cta"
                initialSignedIn={initialSignedIn}
              />
              <Link href={localeHref('/pokedex', language)} className="home-secondary-cta">
                {t('lunidex_home.cta_pokedex')}
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <HomeHeroVisual />
        </section>

        <section id="cards" className="home-preview-bento" aria-labelledby="home-preview-title">
          <div className="home-section-heading">
            <div>
              <p className="home-section-kicker">{t('lunidex_home.tools_eyebrow')}</p>
              <h2 id="home-preview-title">{t('lunidex_home.tools_title')}</h2>
            </div>
            <p>{t('lunidex_home.tools_body')}</p>
          </div>

          <div className="home-preview-bento-grid">
            <HomeMotionSection className="home-preview-bento-cell home-preview-bento-cell-collection" delay={0.04}>
              <HomeCollectionPreview locale={language} copy={collectionCopy} showAction={false} />
            </HomeMotionSection>

            <HomeMotionSection className="home-preview-bento-cell home-preview-bento-cell-pokedex" delay={0.1}>
              <article id="specimen" aria-labelledby="home-pokedex-preview-title">
                <h3 id="home-pokedex-preview-title" className="sr-only">{t('lunidex_home.tools_pokedex_title')}</h3>
                <HomePokedexPreview />
              </article>
            </HomeMotionSection>

            <HomeMotionSection className="home-preview-bento-cell home-preview-bento-cell-team" delay={0.16}>
              <article id="team" aria-labelledby="home-team-preview-title">
                <h3 id="home-team-preview-title" className="sr-only">{t('lunidex_home.tools_team_title')}</h3>
                <HomeTeamPreview />
              </article>
            </HomeMotionSection>
          </div>
        </section>

        <HomeCollectionSteps />

        <section id="progress" className="home-local-first" aria-labelledby="home-local-first-title">
          <div id="lunidex-identity" className="home-local-first-copy">
            <p className="home-section-kicker">{t('lunidex_home.trust_title')}</p>
            <h2 id="home-local-first-title">{t('about.identity_title')}</h2>
            <p>{t('about.identity_body')}</p>
            <p>{t('lunidex_home.trust_body')}</p>
            <p className="home-local-first-independent">{t('lunidex_home.independent')}</p>
            <div className="home-support-actions">
              <Link href={localeHref('/about', language)} className="home-secondary-cta">
                {t('about.heading')}
                <span aria-hidden="true">↗</span>
              </Link>
              <Link href={localeHref('/dashboard', language)} className="home-inline-link">
                {t('footer.navigation.dashboard')}
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>

          <article id="open-source" className="home-open-source" aria-labelledby="home-open-source-title">
            <div className="home-open-source-brand" aria-hidden="true">
              <LunidexLogo alt="" sizes="52px" className="h-11 w-11 object-contain" />
            </div>
            <p className="home-section-kicker">{t('about.eyebrow')}</p>
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
      </main>
    </div>
  );
}

export default HomeArchiveExperience;
