import Link from 'next/link';
import type { ReactNode } from 'react';
import HomeFaqSection from '@/components/layout/HomeFaqSection';
import { getServerAuthUser } from '@/lib/neon/auth';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { localeHref } from '@/lib/seo';
import { GITHUB_REPO_URL } from '@/lib/site';
import { HomeCollectionEntry } from './HomeCollectionEntry';
import { HomeFieldWorld } from './HomeFieldWorld';
import HomeHeader from './HomeHeader';
import { HomeWordReveal } from './HomeWordReveal';

interface FieldChapterProps {
  id: string;
  index: string;
  chapterIndex: number;
  chapterLabel: string;
  title: string;
  body: string;
  proof?: string[];
  action?: ReactNode;
  note?: ReactNode;
  align?: 'left' | 'right';
  headingLevel?: 'h1' | 'h2';
  locale?: string;
}

function FieldChapter({
  id,
  index,
  chapterIndex,
  chapterLabel,
  title,
  body,
  proof,
  action,
  note,
  align = 'left',
  headingLevel = 'h2',
  locale = 'en',
}: FieldChapterProps) {
  const Heading = headingLevel;

  return (
    <section
      id={id}
      className={`field-chapter field-chapter-${align} field-chapter-${id}`}
      data-field-chapter-index={chapterIndex}
      data-field-chapter={id}
      aria-labelledby={`${id}-title`}
    >
      <div className="field-chapter-copy">
        <div className="field-chapter-topline">
          <span className="field-chapter-number">{index}</span>
          <span className="field-chapter-rule" aria-hidden="true" />
          <span>{chapterLabel}</span>
        </div>
        <Heading id={`${id}-title`} className="field-chapter-title">
          <HomeWordReveal text={title} locale={locale} />
        </Heading>
        <p className="field-chapter-body">{body}</p>
        {action && <div className="field-chapter-action">{action}</div>}
        {note}
        {proof && proof.length > 0 && (
          <ul className="field-proof-list">
            {proof.map((item) => (
              <li key={item}>
                <span aria-hidden="true">+</span>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export async function HomeArchiveExperience() {
  const [t, language, serverUser] = await Promise.all([getServerT(), getServerLanguage(), getServerAuthUser()]);
  const initialSignedIn = Boolean(serverUser);

  const stageCopy = {
    indexLabel: t('lunidex_archive.hero_eyebrow'),
    indexContextLabel: t('lunidex_archive.field_index_context'),
    labLabel: t('lunidex_archive.field_lab'),
    specimenLabel: t('lunidex_archive.pokedex_eyebrow'),
    statsLabel: t('detail.stats'),
    evolutionLabel: t('detail.evolution'),
    teamLabel: t('lunidex_archive.team_eyebrow'),
    typeCoverageLabel: t('types_page.type_chart'),
    progressLabel: t('dashboard.title'),
    progressTitle: t('lunidex_archive.field_progress_title'),
    progressBody: t('lunidex_archive.field_progress_body'),
    caughtLabel: t('lunidex_archive.field_caught'),
    favoritesLabel: t('lunidex_archive.field_favorites'),
    badgesLabel: t('lunidex_archive.field_badges'),
    cardsLabel: t('lunidex_home.preview_note'),
    baseSetLabel: t('lunidex_home.preview_eyebrow'),
    ownedLabel: t('tcg.collection_owned'),
    missingLabel: t('tcg.collection_missing'),
    wishlistLabel: t('tcg.wishlist_title'),
    scrollLabel: t('lunidex_archive.field_demo_label'),
    demoLabel: t('lunidex_archive.field_demo_label'),
    electricLabel: t('types.electric'),
    fireLabel: t('types.fire'),
    waterLabel: t('types.water'),
    ghostLabel: t('types.ghost'),
    fightingLabel: t('types.fighting'),
    steelLabel: t('types.steel'),
    fairyLabel: t('types.fairy'),
    pikachuLabel: t('lunidex_archive.field_pikachu'),
    pichuLabel: t('lunidex_archive.field_pichu'),
    raichuLabel: t('lunidex_archive.field_raichu'),
    teamNames: {
      6: t('lunidex_archive.field_charizard'),
      9: t('lunidex_archive.field_blastoise'),
      94: t('lunidex_archive.field_gengar'),
      448: t('lunidex_archive.field_lucario'),
      700: t('lunidex_archive.field_sylveon'),
      25: t('lunidex_archive.field_pikachu'),
    },
  };

  return (
    <div className="lunidex-home">
      <HomeHeader initialSignedIn={initialSignedIn} />
      <main id="home-main" tabIndex={-1} className="field-home-main">
        <HomeFieldWorld stageCopy={stageCopy}>
          <FieldChapter
            id="threshold"
            index="01"
            chapterIndex={0}
            chapterLabel={t('lunidex_archive.hero_eyebrow')}
            title={t('lunidex_home.hero_title')}
            body={t('lunidex_home.hero_body')}
            headingLevel="h1"
            locale={language}
            action={(
              <div className="field-hero-actions">
                <HomeCollectionEntry
                  locale={language}
                  startLabel={t('lunidex_home.cta_start')}
                  resumeLabel={t('lunidex_home.cta_resume')}
                  className="field-primary-cta"
                  initialSignedIn={initialSignedIn}
                />
                <Link href={localeHref('/pokedex', language)} className="field-secondary-cta">
                  {t('lunidex_home.cta_pokedex')}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
            note={(
              <p className="field-hero-note">
                {t('auth.signin_subtitle', { defaultValue: 'Sign in to save and sync your collection.' })}
              </p>
            )}
          />

          <FieldChapter
            id="cards"
            index="02"
            chapterIndex={1}
            chapterLabel={t('lunidex_home.preview_eyebrow')}
            title={t('lunidex_home.preview_title')}
            body={t('lunidex_home.preview_body')}
            locale={language}
            proof={[t('tcg.collection_owned'), t('tcg.collection_missing'), t('tcg.wishlist_title')]}
            action={(
              <HomeCollectionEntry
                locale={language}
                startLabel={t('lunidex_home.cta_start')}
                resumeLabel={t('lunidex_home.cta_resume')}
                className="field-text-cta"
                initialSignedIn={initialSignedIn}
              />
            )}
          />

          <FieldChapter
            id="specimen"
            index="03"
            chapterIndex={2}
            chapterLabel={t('lunidex_archive.pokedex_eyebrow')}
            title={t('lunidex_archive.pokedex_title')}
            body={t('lunidex_home.tools_pokedex_body')}
            locale={language}
            proof={[t('detail.stats'), t('detail.evolution')]}
            align="right"
            action={(
              <Link href={localeHref('/pokedex', language)} className="field-text-cta">
                {t('lunidex_home.cta_pokedex')}
                <span aria-hidden="true">→</span>
              </Link>
            )}
          />

          <FieldChapter
            id="team"
            index="04"
            chapterIndex={3}
            chapterLabel={t('lunidex_archive.team_eyebrow')}
            title={t('lunidex_archive.team_title')}
            body={t('lunidex_home.tools_team_body')}
            locale={language}
            proof={[t('types_page.type_chart'), t('competitive.title')]}
            action={(
              <Link href={localeHref('/team', language)} className="field-text-cta">
                {t('lunidex_home.tools_team_title')}
                <span aria-hidden="true">→</span>
              </Link>
            )}
          />

          <FieldChapter
            id="progress"
            index="05"
            chapterIndex={4}
            chapterLabel={t('dashboard.title')}
            title={t('lunidex_archive.field_progress_title')}
            body={t('lunidex_archive.field_progress_body')}
            locale={language}
            proof={[t('lunidex_archive.field_caught'), t('lunidex_archive.field_favorites'), t('lunidex_archive.field_badges')]}
            align="right"
            action={(
              <Link href={localeHref('/dashboard', language)} className="field-text-cta">
                {t('footer.navigation.dashboard')}
                <span aria-hidden="true">→</span>
              </Link>
            )}
          />

        </HomeFieldWorld>

        <section
          id="lunidex-identity"
          className="field-support-section"
          aria-labelledby="lunidex-identity-title"
        >
          <div className="field-support-intro">
            <p className="field-eyebrow">{t('about.eyebrow')}</p>
            <h2 id="lunidex-identity-title">{t('about.identity_title')}</h2>
            <p>{t('about.identity_body')}</p>
            <Link href={localeHref('/about', language)} className="field-text-cta">
              {t('about.heading')}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className="field-support-section" aria-labelledby="field-support-title">
          <div className="field-support-intro">
            <p className="field-eyebrow">{t('lunidex_home.trust_title')}</p>
            <h2 id="field-support-title">{t('auth.signin_title', { defaultValue: 'Sign in to continue' })}</h2>
            <p>{t('auth.signin_subtitle', { defaultValue: 'Sign in to save and sync your collection.' })}</p>
          </div>
          <div className="field-support-grid field-support-grid-single">
            <article id="open-source" className="field-support-card field-support-card-dark">
              <span className="field-support-index">{t('lunidex_archive.field_open')} / 01</span>
              <h3>{t('about.opensource_title')}</h3>
              <p>{t('about.cards.github')}</p>
              <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className="field-text-cta">
                {t('footer.resources.github')}
                <span aria-hidden="true">↗</span>
              </a>
            </article>
          </div>
        </section>

        <div className="field-faq-wrap">
          <HomeFaqSection />
        </div>
      </main>
    </div>
  );
}

export default HomeArchiveExperience;
