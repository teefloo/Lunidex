import type { Metadata } from 'next';
import Link from 'next/link';

import Header from '@/components/layout/Header';
import { ANNIVERSARY_30_PATH, isAnniversary30Language } from '@/lib/anniversary-30';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import {
  buildBreadcrumbJsonLd,
  buildInLanguage,
  buildSubpathLanguages,
  buildWebPageJsonLd,
  localeHref,
  DEFAULT_OG_IMAGE,
} from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { GITHUB_REPO_URL, SITE_NAME, SITE_URL } from '@/lib/site';
import {
  COMPETITOR_ARTICLES,
  FEATURE_GUIDES,
  getEditorialDates,
  isEditorialIndexable,
} from '@/lib/editorial';

const PAGE_PATH = '/blog';
const LAST_UPDATED = '2026-08-22';
const POKEAPI_SOURCE = 'https://pokeapi.co';
const TCGDEX_SOURCE = 'https://www.tcgdex.net';

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const title = t('blog.meta_title');
  const description = t('blog.meta_description');
  const localizedPath = localeHref(PAGE_PATH, language);

  return {
    title,
    description,
    alternates: {
      canonical: localizedPath,
      languages: buildSubpathLanguages(PAGE_PATH),
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: localizedPath,
      type: 'website',
      images: [{ ...DEFAULT_OG_IMAGE, alt: t('blog.og_alt') }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function BlogPage() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const localizedPath = localeHref(PAGE_PATH, language);
  const pageUrl = `${SITE_URL}${localizedPath}`;
  const dateFormatter = new Intl.DateTimeFormat(buildInLanguage(language), {
    dateStyle: 'medium',
  });
  const formattedDate = dateFormatter.format(new Date(`${LAST_UPDATED}T00:00:00Z`));

  const existingGuideArticles = [
    {
      path: '/guides/pokemon-card-collection-tracker',
      eyebrow: t('collection_guide.nav_label'),
      title: t('collection_guide.meta_title'),
      description: t('collection_guide.meta_description'),
      ...getEditorialDates('/guides/pokemon-card-collection-tracker'),
    },
    {
      path: '/guides/team-builder-guide',
      eyebrow: t('team_guide.nav_label'),
      title: t('team_guide.meta_title'),
      description: t('team_guide.meta_description'),
      ...getEditorialDates('/guides/team-builder-guide'),
    },
    {
      path: '/guides/quiz-guide',
      eyebrow: t('quiz_guide.nav_label'),
      title: t('quiz_guide.meta_title'),
      description: t('quiz_guide.meta_description'),
      ...getEditorialDates('/guides/quiz-guide'),
    },
    {
      path: '/guides/nuzlocke-guide',
      eyebrow: t('nuzlocke_guide.nav_label'),
      title: t('nuzlocke_guide.meta_title'),
      description: t('nuzlocke_guide.meta_description'),
      ...getEditorialDates('/guides/nuzlocke-guide'),
    },
  ];

  const existingComparisonArticles = [
    {
      path: '/compare/lunidex-vs-pokecardex-zebradex',
      eyebrow: t('comparison.nav_label'),
      title: t('comparison.meta_title'),
      description: t('comparison.meta_description'),
      ...getEditorialDates('/compare/lunidex-vs-pokecardex-zebradex'),
    },
  ];

  const editorialGuideArticles = isEditorialIndexable(language) ? FEATURE_GUIDES.map((guide) => {
    const key = `editorial.guides.${guide.slug.replace(/-guide$/, '').replaceAll('-', '_')}`;
    return {
      path: guide.path,
      eyebrow: t(`${key}.nav_label`),
      title: t(`${key}.meta_title`),
      description: t(`${key}.meta_description`),
      ...getEditorialDates(guide.path),
    };
  }) : [];

  const editorialComparisonArticles = isEditorialIndexable(language) ? COMPETITOR_ARTICLES.map((article) => {
    const key = `editorial.competitors.${article.slug.replaceAll('-', '_')}`;
    return {
      path: article.path,
      eyebrow: t(`${key}.nav_label`),
      title: t(`${key}.meta_title`),
      description: t(`${key}.meta_description`),
      ...getEditorialDates(article.path),
    };
  }) : [];

  const guideArticles = [...existingGuideArticles, ...editorialGuideArticles];
  const comparisonArticles = [...existingComparisonArticles, ...editorialComparisonArticles];

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: SITE_NAME, path: '/' },
    { name: t('blog.breadcrumb_label'), path: PAGE_PATH },
  ], language);
  const pageJsonLd = {
    ...buildWebPageJsonLd({
      lang: language,
      path: localizedPath,
      name: t('blog.meta_title'),
      headline: t('blog.heading'),
      description: t('blog.meta_description'),
      about: 'Lunidex guides and comparisons',
      keywords: 'Lunidex guides, Pokémon team builder guide, Pokémon quiz guide, Nuzlocke tracker, Pokémon TCG comparison',
    }),
    dateModified: LAST_UPDATED,
    articleSection: t('blog.eyebrow'),
    citation: [
      { '@type': 'WebPage', name: 'Lunidex source repository', url: GITHUB_REPO_URL },
      { '@type': 'WebPage', name: 'PokéAPI', url: POKEAPI_SOURCE },
      { '@type': 'WebPage', name: 'TCGdex', url: TCGDEX_SOURCE },
    ],
  };
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${pageUrl}#articles`,
    url: pageUrl,
    inLanguage: buildInLanguage(language),
    name: t('blog.meta_title'),
    itemListElement: [...guideArticles, ...comparisonArticles].map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: article.title,
      item: `${SITE_URL}${localeHref(article.path, language)}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd({ '@graph': [pageJsonLd, breadcrumb, itemListJsonLd] }) }}
      />
      <div className="app-page">
        <Header />
        <main className="page-shell pt-28 pb-24 relative">
          <article className="mx-auto w-full max-w-5xl px-5 md:px-8">
            <header className="mx-auto max-w-4xl text-center">
              <p className="page-eyebrow justify-center">{t('blog.eyebrow')}</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-6xl">
                {t('blog.heading')}
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-foreground/70 md:text-lg">
                {t('blog.intro')}
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-foreground/45">
                {t('blog.updated', { date: formattedDate })}
              </p>
            </header>

            {isEditorialIndexable(language) && isAnniversary30Language(language) ? (
              <section className="mx-auto mt-12 max-w-4xl rounded-sm border border-primary/30 bg-primary/5 p-6 md:flex md:items-center md:justify-between md:gap-8 md:p-8" aria-labelledby="blog-anniversary-30-title">
                <div>
                  <p className="page-eyebrow">{t('anniversary_30.eyebrow')}</p>
                  <h2 id="blog-anniversary-30-title" className="mt-2 text-2xl font-extrabold tracking-tight">
                    {t('anniversary_30.heading')}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/70">{t('anniversary_30.intro')}</p>
                </div>
                <Link href={localeHref(ANNIVERSARY_30_PATH, language)} className="glass-btn glass-btn-active mt-5 inline-flex min-h-11 shrink-0 items-center px-4 py-3 text-sm font-bold md:mt-0">
                  {t('anniversary_30.cta_tracker')}
                </Link>
              </section>
            ) : null}

            <section className="mt-12" aria-labelledby="blog-guides-title">
              <div className="mx-auto max-w-3xl text-center">
                <p className="page-eyebrow justify-center">{t('blog.guides_eyebrow')}</p>
                <h2 id="blog-guides-title" className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                  {t('blog.guides_title')}
                </h2>
                <p className="mt-4 leading-7 text-foreground/70">{t('blog.guides_intro')}</p>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {guideArticles.map((article) => (
                  <Link
                    key={article.path}
                    href={localeHref(article.path, language)}
                    className="section-frame group flex flex-col gap-3 p-6 md:p-7"
                  >
                    <p className="page-eyebrow">{article.eyebrow}</p>
                    <h3 className="text-xl font-extrabold tracking-tight transition-colors group-hover:text-primary">
                      {article.title}
                    </h3>
                    <p className="text-sm leading-7 text-foreground/70">{article.description}</p>
                    <time dateTime={article.publishedAt} className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/45">
                      {t('blog.published', { date: dateFormatter.format(new Date(`${article.publishedAt}T00:00:00Z`)) })}
                    </time>
                    <span className="mt-auto pt-3 text-sm font-bold text-primary underline decoration-primary/30 underline-offset-4 group-hover:decoration-primary">
                      {t('blog.read_guide')}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="mt-12" aria-labelledby="blog-comparisons-title">
              <div className="mx-auto max-w-3xl text-center">
                <p className="page-eyebrow justify-center">{t('blog.comparisons_eyebrow')}</p>
                <h2 id="blog-comparisons-title" className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                  {t('blog.comparisons_title')}
                </h2>
                <p className="mt-4 leading-7 text-foreground/70">{t('blog.comparisons_intro')}</p>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {comparisonArticles.map((article) => (
                  <Link
                    key={article.path}
                    href={localeHref(article.path, language)}
                    className="section-frame group flex flex-col gap-3 p-6 md:p-7"
                  >
                    <p className="page-eyebrow">{article.eyebrow}</p>
                    <h3 className="text-xl font-extrabold tracking-tight transition-colors group-hover:text-primary">
                      {article.title}
                    </h3>
                    <p className="text-sm leading-7 text-foreground/70">{article.description}</p>
                    <time dateTime={article.publishedAt} className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/45">
                      {t('blog.published', { date: dateFormatter.format(new Date(`${article.publishedAt}T00:00:00Z`)) })}
                    </time>
                    <span className="mt-auto pt-3 text-sm font-bold text-primary underline decoration-primary/30 underline-offset-4 group-hover:decoration-primary">
                      {t('blog.read_comparison')}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="mx-auto mt-12 max-w-4xl border-t border-border/60 pt-8" aria-labelledby="blog-sources-title">
              <h2 id="blog-sources-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('blog.sources_title')}
              </h2>
              <p className="mt-4 leading-7 text-foreground/70">{t('blog.sources_body')}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                  {t('blog.source_lunidex')}
                </a>
                <a href={POKEAPI_SOURCE} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                  PokéAPI
                </a>
                <a href={TCGDEX_SOURCE} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                  TCGdex
                </a>
              </div>
            </section>

            <nav className="mx-auto mt-10 max-w-4xl" aria-label={t('blog.cta_title')}>
              <p className="page-eyebrow">{t('blog.cta_title')}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={localeHref('/pokedex', language)} className="glass-btn glass-btn-active touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('blog.cta_pokedex')}
                </Link>
                <Link href={localeHref('/team', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('blog.cta_team')}
                </Link>
                <Link href={localeHref('/quiz', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('blog.cta_quiz')}
                </Link>
                <Link href={localeHref('/tcg', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('blog.cta_tcg')}
                </Link>
              </div>
            </nav>
          </article>
        </main>
      </div>
    </>
  );
}
