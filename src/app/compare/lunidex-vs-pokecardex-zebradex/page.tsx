import type { Metadata } from 'next';
import Link from 'next/link';

import Header from '@/components/layout/Header';
import { getEditorialDates } from '@/lib/editorial';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import {
  buildArticleJsonLd,
  buildInLanguage,
  buildSubpathLanguages,
  localeHref,
  DEFAULT_OG_IMAGE,
} from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { GITHUB_REPO_URL, SITE_URL } from '@/lib/site';

const PAGE_PATH = '/compare/lunidex-vs-pokecardex-zebradex';
const { publishedAt: PUBLISHED_AT, updatedAt: LAST_UPDATED } = getEditorialDates(PAGE_PATH);
const POKECARDEX_SOURCE = 'https://www.pokecardex.com/app';
const ZEBRADEX_SOURCE = 'https://zebradex.fr/index.php';

type ComparisonRow = {
  label: string;
  lunidex: string;
  pokecardex: string;
  zebradex: string;
};

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const title = t('comparison.meta_title');
  const description = t('comparison.meta_description');
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

export default async function LunidexComparisonPage() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const localizedPath = localeHref(PAGE_PATH, language);
  const pageUrl = `${SITE_URL}${localizedPath}`;
  const dateFormatter = new Intl.DateTimeFormat(buildInLanguage(language), {
    dateStyle: 'medium',
  });
  const formattedDate = dateFormatter.format(new Date(`${LAST_UPDATED}T00:00:00Z`));
  const formattedPublishedDate = dateFormatter.format(new Date(`${PUBLISHED_AT}T00:00:00Z`));

  const rows: ComparisonRow[] = [
    {
      label: t('comparison.row_format'),
      lunidex: t('comparison.lunidex_format'),
      pokecardex: t('comparison.pokecardex_format'),
      zebradex: t('comparison.zebradex_format'),
    },
    {
      label: t('comparison.row_collection'),
      lunidex: t('comparison.lunidex_collection'),
      pokecardex: t('comparison.pokecardex_collection'),
      zebradex: t('comparison.zebradex_collection'),
    },
    {
      label: t('comparison.row_scanner'),
      lunidex: t('comparison.lunidex_scanner'),
      pokecardex: t('comparison.pokecardex_scanner'),
      zebradex: t('comparison.zebradex_scanner'),
    },
    {
      label: t('comparison.row_prices'),
      lunidex: t('comparison.lunidex_prices'),
      pokecardex: t('comparison.pokecardex_prices'),
      zebradex: t('comparison.zebradex_prices'),
    },
    {
      label: t('comparison.row_reference'),
      lunidex: t('comparison.lunidex_reference'),
      pokecardex: t('comparison.pokecardex_reference'),
      zebradex: t('comparison.zebradex_reference'),
    },
    {
      label: t('comparison.row_storage'),
      lunidex: t('comparison.lunidex_storage'),
      pokecardex: t('comparison.pokecardex_storage'),
      zebradex: t('comparison.zebradex_storage'),
    },
  ];

  const faqs = [
    { question: t('comparison.faq_q1'), answer: t('comparison.faq_a1') },
    { question: t('comparison.faq_q2'), answer: t('comparison.faq_a2') },
    { question: t('comparison.faq_q3'), answer: t('comparison.faq_a3') },
    { question: t('comparison.faq_q4'), answer: t('comparison.faq_a4') },
  ];

  const pageJsonLd = {
    ...buildArticleJsonLd({
      lang: language,
      path: localizedPath,
      name: t('comparison.meta_title'),
      headline: t('comparison.heading'),
      description: t('comparison.meta_description'),
      datePublished: PUBLISHED_AT,
      dateModified: LAST_UPDATED,
      about: 'Pokémon TCG collection tools',
      keywords: 'Pokémon card collection tracker, Pokémon TCG app, Pokédex, team builder, card scanner comparison',
    }),
    citation: [
      { '@type': 'WebPage', name: t('comparison.pokecardex_source_label'), url: POKECARDEX_SOURCE },
      { '@type': 'WebPage', name: t('comparison.zebradex_source_label'), url: ZEBRADEX_SOURCE },
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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd({ '@graph': [pageJsonLd, faqJsonLd] }) }}
      />
      <div className="app-page">
        <Header />
        <main className="page-shell pt-28 pb-24 relative">
          <article className="mx-auto w-full max-w-6xl px-5 md:px-8">
            <header className="mx-auto max-w-4xl text-center">
              <p className="page-eyebrow justify-center">{t('comparison.eyebrow')}</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-6xl">
                {t('comparison.heading')}
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-foreground/70 md:text-lg">
                {t('comparison.intro')}
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-foreground/45">
                <time dateTime={PUBLISHED_AT}>{t('blog.published', { date: formattedPublishedDate })}</time>
                <span aria-hidden="true"> · </span>
                <time dateTime={LAST_UPDATED}>{t('comparison.updated', { date: formattedDate })}</time>
              </p>
            </header>

            <section className="mx-auto mt-12 max-w-4xl rounded-sm border border-primary/30 bg-primary/5 p-6 md:p-8" aria-labelledby="comparison-verdict-title">
              <h2 id="comparison-verdict-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('comparison.verdict_title')}
              </h2>
              <p className="mt-4 text-base leading-8 text-foreground/80">
                {t('comparison.verdict_body')}
              </p>
            </section>

            <section className="mx-auto mt-8 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="comparison-method-title">
              <h2 id="comparison-method-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('comparison.method_title')}
              </h2>
              <p className="mt-4 leading-7 text-foreground/75">
                {t('comparison.method_body')}
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="rounded-sm border border-border/60 bg-card/40 p-4 text-sm font-bold text-primary hover:border-primary/60">
                  {t('comparison.lunidex_source_label')}
                </a>
                <a href={POKECARDEX_SOURCE} target="_blank" rel="noopener noreferrer" className="rounded-sm border border-border/60 bg-card/40 p-4 text-sm font-bold text-primary hover:border-primary/60">
                  {t('comparison.pokecardex_source_label')}
                </a>
                <a href={ZEBRADEX_SOURCE} target="_blank" rel="noopener noreferrer" className="rounded-sm border border-border/60 bg-card/40 p-4 text-sm font-bold text-primary hover:border-primary/60">
                  {t('comparison.zebradex_source_label')}
                </a>
              </div>
            </section>

            <section id="comparison" className="mt-12" aria-labelledby="comparison-table-title">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="page-eyebrow">{t('comparison.eyebrow')}</p>
                  <h2 id="comparison-table-title" className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
                    {t('comparison.table_caption')}
                  </h2>
                </div>
              </div>
              <div className="overflow-x-auto rounded-sm border border-border/60 bg-card/30">
                <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                  <caption className="sr-only">{t('comparison.table_caption')}</caption>
                  <thead className="bg-foreground text-background">
                    <tr>
                      <th scope="col" className="w-[18%] p-4 font-black">{t('comparison.col_capability')}</th>
                      <th scope="col" className="w-[27%] p-4 font-black">{t('comparison.col_lunidex')}</th>
                      <th scope="col" className="w-[27%] p-4 font-black">{t('comparison.col_pokecardex')}</th>
                      <th scope="col" className="w-[28%] p-4 font-black">{t('comparison.col_zebradex')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label} className="border-t border-border/50 align-top even:bg-muted/25">
                        <th scope="row" className="p-4 font-extrabold text-foreground">{row.label}</th>
                        <td className="p-4 leading-6 text-foreground/75">{row.lunidex}</td>
                        <td className="p-4 leading-6 text-foreground/75">{row.pokecardex}</td>
                        <td className="p-4 leading-6 text-foreground/75">{row.zebradex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm leading-6 text-foreground/55">
                {t('comparison.sources_note')}
              </p>
            </section>

            <section className="mt-12 grid gap-8 lg:grid-cols-2" aria-labelledby="comparison-facts-title">
              <div className="section-frame p-6 md:p-8">
                <h2 id="comparison-facts-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                  {t('comparison.facts_title')}
                </h2>
                <p className="mt-4 leading-7 text-foreground/70">{t('comparison.facts_intro')}</p>
                <ul className="mt-5 space-y-4 text-sm leading-7 text-foreground/80">
                  <li><strong>{t('comparison.row_reference')}:</strong> {t('comparison.fact_pokedex')}</li>
                  <li><strong>{t('comparison.row_reference')}:</strong> {t('comparison.fact_team')}</li>
                  <li><strong>{t('comparison.row_collection')}:</strong> {t('comparison.fact_tcg')}</li>
                  <li><strong>{t('comparison.method_title')}:</strong> {t('comparison.fact_sources')}</li>
                </ul>
              </div>

              <div className="section-frame p-6 md:p-8" aria-labelledby="comparison-faq-title">
                <h2 id="comparison-faq-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                  {t('comparison.faq_title')}
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
              </div>
            </section>

            <nav className="mx-auto mt-12 max-w-4xl border-t border-border/60 pt-8" aria-label={t('comparison.cta_title')}>
              <p className="page-eyebrow">{t('comparison.cta_title')}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={localeHref('/about', language)} className="glass-btn glass-btn-active touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('comparison.cta_about')}
                </Link>
                <Link href={localeHref('/faq', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('comparison.cta_faq')}
                </Link>
                <Link href={localeHref('/tcg', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('comparison.cta_tcg')}
                </Link>
                <Link href={localeHref('/team', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('comparison.cta_team')}
                </Link>
                <Link href={localeHref('/guides/pokemon-card-collection-tracker', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('comparison.cta_guide')}
                </Link>
              </div>
            </nav>
          </article>
        </main>
      </div>
    </>
  );
}
