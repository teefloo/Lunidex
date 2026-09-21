import type { Metadata } from 'next';
import Link from 'next/link';

import Header from '@/components/layout/Header';
import { ANNIVERSARY_30_PATH, isAnniversary30Language } from '@/lib/anniversary-30';
import { getEditorialDates } from '@/lib/editorial';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildInLanguage,
  buildSubpathLanguages,
  localeHref,
  DEFAULT_OG_IMAGE,
} from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { GITHUB_REPO_URL, SITE_NAME, SITE_URL } from '@/lib/site';

const PAGE_PATH = '/guides/pokemon-card-collection-tracker';
const { publishedAt: PUBLISHED_AT, updatedAt: LAST_UPDATED } = getEditorialDates(PAGE_PATH);
const POKEAPI_SOURCE = 'https://pokeapi.co';
const TCGDEX_SOURCE = 'https://www.tcgdex.net';

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const title = t('collection_guide.meta_title');
  const description = t('collection_guide.meta_description');
  const localizedPath = localeHref(PAGE_PATH, language);

  return {
    title: { absolute: title },
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
      type: 'article',
      publishedTime: PUBLISHED_AT,
      modifiedTime: LAST_UPDATED,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PokemonCardCollectionTrackerGuide() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const localizedPath = localeHref(PAGE_PATH, language);
  const pageUrl = `${SITE_URL}${localizedPath}`;
  const dateFormatter = new Intl.DateTimeFormat(buildInLanguage(language), {
    dateStyle: 'medium',
  });
  const formattedDate = dateFormatter.format(new Date(`${LAST_UPDATED}T00:00:00Z`));
  const formattedPublishedDate = dateFormatter.format(new Date(`${PUBLISHED_AT}T00:00:00Z`));

  const criteria = [
    {
      title: t('collection_guide.criteria_catalog_title'),
      body: t('collection_guide.criteria_catalog_body'),
    },
    {
      title: t('collection_guide.criteria_languages_title'),
      body: t('collection_guide.criteria_languages_body'),
    },
    {
      title: t('collection_guide.criteria_ownership_title'),
      body: t('collection_guide.criteria_ownership_body'),
    },
    {
      title: t('collection_guide.criteria_sets_title'),
      body: t('collection_guide.criteria_sets_body'),
    },
    {
      title: t('collection_guide.criteria_prices_title'),
      body: t('collection_guide.criteria_prices_body'),
    },
    {
      title: t('collection_guide.criteria_sync_title'),
      body: t('collection_guide.criteria_sync_body'),
    },
  ];

  const facts = [
    { title: t('collection_guide.fact_free_title'), body: t('collection_guide.fact_free_body') },
    { title: t('collection_guide.fact_start_title'), body: t('collection_guide.fact_start_body') },
    { title: t('collection_guide.fact_offline_title'), body: t('collection_guide.fact_offline_body') },
    { title: t('collection_guide.fact_sync_title'), body: t('collection_guide.fact_sync_body') },
    { title: t('collection_guide.fact_platform_title'), body: t('collection_guide.fact_platform_body') },
  ];

  const matrixRows = [
    { label: t('collection_guide.criteria_catalog_title'), value: t('collection_guide.matrix_catalog_value') },
    { label: t('collection_guide.criteria_ownership_title'), value: t('collection_guide.matrix_ownership_value') },
    { label: t('collection_guide.criteria_sets_title'), value: t('collection_guide.matrix_progress_value') },
    { label: t('collection_guide.criteria_sync_title'), value: t('collection_guide.matrix_sync_value') },
    { label: t('collection_guide.matrix_scanner_label'), value: t('collection_guide.matrix_scanner_value') },
    { label: t('collection_guide.matrix_market_label'), value: t('collection_guide.matrix_market_value') },
    { label: t('collection_guide.matrix_platform_label'), value: t('collection_guide.matrix_platform_value') },
  ];

  const faqs = [
    { question: t('collection_guide.faq_q1'), answer: t('collection_guide.faq_a1') },
    { question: t('collection_guide.faq_q2'), answer: t('collection_guide.faq_a2') },
    { question: t('collection_guide.faq_q3'), answer: t('collection_guide.faq_a3') },
    { question: t('collection_guide.faq_q4'), answer: t('collection_guide.faq_a4') },
  ];

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: SITE_NAME, path: '/' },
    { name: t('collection_guide.nav_label'), path: PAGE_PATH },
  ], language);
  const pageJsonLd = {
    ...buildArticleJsonLd({
      lang: language,
      path: localizedPath,
      name: t('collection_guide.meta_title'),
      headline: t('collection_guide.heading'),
      description: t('collection_guide.meta_description'),
      datePublished: PUBLISHED_AT,
      dateModified: LAST_UPDATED,
      about: 'Pokémon TCG collection tracking',
      keywords: 'Pokémon card collection tracker, Pokémon card collection app, free Pokémon card tracker, organize Pokémon cards, card collection guide',
    }),
    articleSection: t('collection_guide.eyebrow'),
    citation: [
      { '@type': 'WebPage', name: 'Lunidex source repository', url: GITHUB_REPO_URL },
      { '@type': 'WebPage', name: 'PokéAPI', url: POKEAPI_SOURCE },
      { '@type': 'WebPage', name: 'TCGdex', url: TCGDEX_SOURCE },
    ],
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    url: pageUrl,
    inLanguage: buildInLanguage(language),
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd({ '@graph': [pageJsonLd, breadcrumb, faqJsonLd] }) }}
      />
      <div className="app-page">
        <Header />
        <main className="page-shell pt-28 pb-24 relative">
          <article className="mx-auto w-full max-w-5xl px-5 md:px-8">
            <header className="mx-auto max-w-4xl text-center">
              <p className="page-eyebrow justify-center">{t('collection_guide.eyebrow')}</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-6xl">
                {t('collection_guide.heading')}
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-foreground/70 md:text-lg">
                {t('collection_guide.intro')}
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-foreground/45">
                <time dateTime={PUBLISHED_AT}>{t('blog.published', { date: formattedPublishedDate })}</time>
                <span aria-hidden="true"> · </span>
                <time dateTime={LAST_UPDATED}>{t('collection_guide.updated', { date: formattedDate })}</time>
              </p>
            </header>

            <section className="mx-auto mt-12 max-w-4xl rounded-sm border border-primary/30 bg-primary/5 p-6 md:p-8" aria-labelledby="collection-guide-answer-title">
              <h2 id="collection-guide-answer-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('collection_guide.answer_title')}
              </h2>
              <p className="mt-4 text-base leading-8 text-foreground/80">
                {t('collection_guide.answer_body')}
              </p>
            </section>

            <section className="mx-auto mt-10 max-w-4xl" aria-labelledby="collection-guide-facts-title">
              <div className="mx-auto max-w-3xl text-center">
                <h2 id="collection-guide-facts-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                  {t('collection_guide.facts_title')}
                </h2>
                <p className="mt-4 leading-7 text-foreground/70">{t('collection_guide.facts_intro')}</p>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {facts.map((fact, index) => (
                  <section key={fact.title} className="section-frame p-5" aria-labelledby={`collection-fact-${index}`}>
                    <h3 id={`collection-fact-${index}`} className="text-lg font-extrabold tracking-tight">
                      {fact.title}
                    </h3>
                    <p className="mt-3 leading-7 text-foreground/70">{fact.body}</p>
                  </section>
                ))}
              </div>
            </section>

            {isAnniversary30Language(language) ? (
              <section className="anniversary-promo mx-auto max-w-4xl rounded-sm border border-primary/30 bg-primary/5 p-6 md:flex md:items-center md:justify-between md:gap-6 md:p-8" aria-labelledby="collection-guide-anniversary-title">
                <div>
                  <p className="page-eyebrow">{t('anniversary_30.eyebrow')}</p>
                  <h2 id="collection-guide-anniversary-title" className="mt-2 text-2xl font-extrabold tracking-tight">
                    {t('anniversary_30.heading')}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-foreground/70">{t('anniversary_30.tracker_body')}</p>
                </div>
                <Link href={`${localeHref(ANNIVERSARY_30_PATH, language)}#tracker`} className="glass-btn glass-btn-active mt-5 inline-flex min-h-11 shrink-0 items-center px-4 py-3 text-sm font-bold md:mt-0">
                  {t('anniversary_30.cta_tracker')}
                </Link>
              </section>
            ) : null}

            <section className="mt-12" aria-labelledby="collection-guide-criteria-title">
              <div className="mx-auto max-w-3xl text-center">
                <h2 id="collection-guide-criteria-title" className="text-3xl font-extrabold tracking-tight md:text-4xl">
                  {t('collection_guide.criteria_title')}
                </h2>
                <p className="mt-4 leading-7 text-foreground/70">{t('collection_guide.criteria_intro')}</p>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {criteria.map((criterion, index) => (
                  <section key={criterion.title} className="section-frame p-6 md:p-7" aria-labelledby={`collection-criterion-${index}`}>
                    <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">0{index + 1}</p>
                    <h3 id={`collection-criterion-${index}`} className="mt-5 text-xl font-extrabold tracking-tight">
                      {criterion.title}
                    </h3>
                    <p className="mt-3 leading-7 text-foreground/70">{criterion.body}</p>
                  </section>
                ))}
              </div>
            </section>

            <section className="mx-auto mt-12 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="collection-guide-matrix-title">
              <h2 id="collection-guide-matrix-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('collection_guide.matrix_title')}
              </h2>
              <p className="mt-4 leading-7 text-foreground/75">{t('collection_guide.matrix_intro')}</p>
              <div className="mt-5 overflow-x-auto rounded-sm border border-border/60">
                <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                  <caption className="sr-only">{t('collection_guide.matrix_title')}</caption>
                  <thead className="bg-card/60 text-xs uppercase tracking-[0.12em] text-foreground/55">
                    <tr>
                      <th scope="col" className="border-b border-border/60 px-4 py-3 font-black">{t('collection_guide.matrix_criterion')}</th>
                      <th scope="col" className="border-b border-border/60 px-4 py-3 font-black">{t('collection_guide.matrix_lunidex')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRows.map((row) => (
                      <tr key={row.label} className="align-top even:bg-card/25">
                        <th scope="row" className="border-b border-border/40 px-4 py-3 font-bold text-foreground/75">{row.label}</th>
                        <td className="border-b border-border/40 px-4 py-3 leading-6 text-foreground/70">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mx-auto mt-12 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="collection-guide-limitations-title">
              <h2 id="collection-guide-limitations-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('collection_guide.limitations_title')}
              </h2>
              <p className="mt-4 leading-7 text-foreground/75">{t('collection_guide.limitations_body')}</p>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-foreground/75">
                <li>• {t('collection_guide.limitation_scanner')}</li>
                <li>• {t('collection_guide.limitation_market')}</li>
                <li>• {t('collection_guide.limitation_mobile')}</li>
              </ul>
            </section>

            <section className="mx-auto mt-12 max-w-4xl" aria-labelledby="collection-guide-start-title">
              <h2 id="collection-guide-start-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('collection_guide.how_to_start_title')}
              </h2>
              <ol className="mt-6 grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((step) => (
                  <li key={step} className="section-frame flex gap-4 p-5">
                    <span className="font-mono text-sm font-bold text-primary">0{step}</span>
                    <p className="leading-7 text-foreground/75">{t(`collection_guide.step${step}`)}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mx-auto mt-12 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="collection-guide-faq-title">
              <h2 id="collection-guide-faq-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('collection_guide.faq_title')}
              </h2>
              <div className="mt-5 divide-y divide-border/60">
                {faqs.map(({ question, answer }) => (
                  <details key={question} className="group py-4 first:pt-0 last:pb-0">
                    <summary className="cursor-pointer list-none pr-6 font-bold text-foreground marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                      {question}
                    </summary>
                    <p className="mt-3 text-sm leading-7 text-foreground/70">{answer}</p>
                  </details>
                ))}
              </div>
            </section>

            <section className="mx-auto mt-12 max-w-4xl border-t border-border/60 pt-8" aria-labelledby="collection-guide-sources-title">
              <h2 id="collection-guide-sources-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('collection_guide.sources_title')}
              </h2>
              <p className="mt-4 leading-7 text-foreground/70">{t('collection_guide.sources_body')}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                  {t('collection_guide.source_lunidex')}
                </a>
                <a href={POKEAPI_SOURCE} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                  PokéAPI
                </a>
                <a href={TCGDEX_SOURCE} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                  TCGdex
                </a>
              </div>
            </section>

            <nav className="mx-auto mt-10 max-w-4xl" aria-label={t('collection_guide.cta_title')}>
              <p className="page-eyebrow">{t('collection_guide.cta_title')}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={localeHref('/tcg', language)} className="glass-btn glass-btn-active touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('collection_guide.cta_catalog')}
                </Link>
                <Link href={localeHref('/pokedex', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('pokedex.title')}
                </Link>
                <Link href={localeHref('/team', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('team.title')}
                </Link>
                <Link href={localeHref('/compare/lunidex-vs-pokecardex-zebradex', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('collection_guide.cta_comparison')}
                </Link>
                <Link href={localeHref('/guides/tcg-workspace-guide', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('collection_guide.cta_workspace')}
                </Link>
                <Link href={localeHref('/compare/lunidex-vs-collectr', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('collection_guide.cta_collectr')}
                </Link>
                <Link href={localeHref('/compare/lunidex-vs-pokellector', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('collection_guide.cta_pokellector')}
                </Link>
                <Link href={localeHref('/compare/lunidex-vs-cardzia', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('collection_guide.cta_cardzia')}
                </Link>
                <Link href={localeHref('/about', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('collection_guide.cta_about')}
                </Link>
              </div>
            </nav>
          </article>
        </main>
      </div>
    </>
  );
}
