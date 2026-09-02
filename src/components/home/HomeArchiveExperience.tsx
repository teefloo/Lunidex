import Link from 'next/link';
import HomeFaqSection from '@/components/layout/HomeFaqSection';
import LunidexLogo from '@/components/ui/LunidexLogo';
import { getServerAuthUser } from '@/lib/neon/auth';
import { ANNIVERSARY_30_PATH, isAnniversary30Language } from '@/lib/anniversary-30';
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
    previewTitle: t('lunidex_home.preview_title'),
    previewBody: t('lunidex_home.preview_body'),
    previewNote: t('lunidex_home.preview_note'),
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

        {isAnniversary30Language(language) ? (
          <section className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8" aria-labelledby="home-anniversary-30-title">
            <div className="rounded-sm border border-primary/30 bg-primary/5 p-6 md:flex md:items-center md:justify-between md:gap-8 md:p-8">
              <div>
                <p className="home-section-kicker">{t('anniversary_30.eyebrow')}</p>
                <h2 id="home-anniversary-30-title" className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                  {t('anniversary_30.heading')}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/70">
                  {t('anniversary_30.intro')}
                </p>
              </div>
              <Link href={localeHref(ANNIVERSARY_30_PATH, language)} className="home-primary-cta mt-5 shrink-0 md:mt-0">
                {t('anniversary_30.cta_tracker')}
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </section>
        ) : null}

        <section id="cards" className="home-preview-bento" aria-labelledby="home-preview-title">
          <div className="home-section-heading">
            <h2 id="home-preview-title">{t('lunidex_home.tools_title')}</h2>
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
            <h2 id="home-local-first-title">{t('about.identity_title')}</h2>
            <p>{t('about.identity_body')}</p>
            <p>{t('lunidex_home.trust_body')}</p>
            <p className="home-local-first-independent">{t('lunidex_home.independent')}</p>
            <div className="home-support-actions">
              <Link href={localeHref('/about', language)} className="home-secondary-cta">
                {t('about.heading')}
                <span aria-hidden="true">↗</span>
              </Link>
              <Link href={localeHref('/faq', language)} className="home-inline-link">
                {t('nav.faq', { defaultValue: 'FAQ' })}
                <span aria-hidden="true">↗</span>
              </Link>
              <Link href={localeHref('/dashboard', language)} className="home-inline-link">
                {t('footer.navigation.dashboard')}
                <span aria-hidden="true">↗</span>
              </Link>
              <Link href={localeHref('/guides/progress-account-guide', language)} className="home-inline-link">
                {t('editorial.guides.progress_account.nav_label', { defaultValue: 'Progress and account guide' })}
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>

          <article id="open-source" className="home-open-source" aria-labelledby="home-open-source-title">
            <div className="home-open-source-brand" aria-hidden="true">
              <LunidexLogo alt="" sizes="52px" className="h-11 w-11 object-contain" />
            </div>
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
