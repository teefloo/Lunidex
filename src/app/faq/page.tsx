import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import FaqSection from '@/components/ui/FaqSection';
import { localizeInternalRouteReferences } from '@/lib/lunidex-home-content';
import {
  SITE_URL,
  SITE_NAME,
  GITHUB_ISSUES_URL,
} from '@/lib/site';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { HelpCircle, MessageCircleQuestion } from 'lucide-react';

type FaqEntry = { q: string; a: string };
type FaqCategory = { id: string; title: string; intro: string; entries: FaqEntry[] };

const LAST_UPDATED = '2026-08-16';
const FAQ_COUNT = 12;

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('faq.meta_title');
  const description = t('faq.meta_description');
  return {
    title,
    description,
    keywords: t('faq.meta_keywords'),
    alternates: {
      canonical: `/${lang}/faq`,
      languages: buildSubpathLanguages('/faq'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/faq`,
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function FaqPage() {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const baseUrl = SITE_URL;
  const formattedLastUpdated = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(
    new Date(`${LAST_UPDATED}T00:00:00Z`),
  );
  const lastUpdatedLabel = t('faq.last_updated', {
    date: formattedLastUpdated,
    count: FAQ_COUNT,
  });
  const answer = (key: string) => localizeInternalRouteReferences(t(key), lang);

  const data: FaqEntry[] = [
    { q: t('faq.q1'), a: answer('faq.a1') },
    { q: t('faq.q2'), a: answer('faq.a2') },
    { q: t('faq.q3'), a: answer('faq.a3') },
    { q: t('faq.q4'), a: answer('faq.a4') },
  ];
  const features: FaqEntry[] = [
    { q: t('faq.q5'), a: answer('faq.a5') },
    { q: t('faq.q6'), a: answer('faq.a6') },
    { q: t('faq.q7'), a: answer('faq.a7') },
    { q: t('faq.q8'), a: answer('faq.a8') },
  ];
  const privacy: FaqEntry[] = [
    { q: t('faq.q9'), a: answer('faq.a9') },
    { q: t('faq.q10'), a: answer('faq.a10') },
    { q: t('faq.q11'), a: answer('faq.a11') },
    { q: t('faq.q12'), a: answer('faq.a12') },
  ];

  const breadcrumb = buildBreadcrumbJsonLd(
    [
      { name: SITE_NAME, path: '/' },
      { name: t('faq.heading'), path: '/faq' },
    ],
    lang,
  );

  const faqPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${baseUrl}/${lang}/faq#faqpage`,
    url: `${baseUrl}/${lang}/faq`,
    name: `${t('faq.heading')} — ${SITE_NAME}`,
    description: t('faq.meta_description'),
    inLanguage: lang,
    isPartOf: { '@id': `${baseUrl}/#website` },
    author: { '@id': `${baseUrl}/#organization` },
    publisher: { '@id': `${baseUrl}/#organization` },
    dateModified: LAST_UPDATED,
    primaryImageOfPage: { '@type': 'ImageObject', url: `${baseUrl}${DEFAULT_OG_IMAGE.url}` },
    mainEntity: [...data, ...features, ...privacy].map((entry) => ({
      '@type': 'Question',
      name: entry.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.a,
      },
    })),
  };

  const categories: FaqCategory[] = [
    { id: 'data', title: t('faq.cat_data_title'), intro: t('faq.cat_data_intro'), entries: data },
    { id: 'features', title: t('faq.cat_features_title'), intro: t('faq.cat_features_intro'), entries: features },
    { id: 'privacy', title: t('faq.cat_privacy_title'), intro: t('faq.cat_privacy_intro'), entries: privacy },
  ];

  const faqFooter = (
    <aside className="mt-16" data-od-id="faq-footer">
      <div className="editorial-ornament mb-6">
        <span aria-hidden="true" className="editorial-ornament__glyph">✦</span>
      </div>
      <div className="page-surface p-8 md:p-10 text-center">
        <p className="cat-no mb-3 text-center">
          <span className="cat-no__num">{String(FAQ_COUNT).padStart(2, '0')}</span>
        </p>
        <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          {t('faq.still_questions_title')}
        </h2>
        <p className="mt-3 text-foreground/70 max-w-xl mx-auto">
          {t('faq.still_questions_body')}
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-btn touch-target inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em]"
          >
            <MessageCircleQuestion aria-hidden="true" className="h-3.5 w-3.5" />
            {t('faq.still_questions_cta_issues')}
          </a>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }}
      />
      <div className="app-page">
        <Header />
        <main className="page-shell pt-28 pb-24 relative">
          <header data-od-id="faq-header">
            <PageHeader
              icon={HelpCircle}
              title={t('faq.heading')}
              subtitle={t('faq.subtitle')}
              eyebrow={t('faq.eyebrow')}
              centered
              className="mb-12"
              badge={
                <p className="cat-no hidden max-w-xs whitespace-normal text-center sm:block">
                  {lastUpdatedLabel}
                </p>
              }
            />
          </header>

          <article className="mx-auto w-full max-w-4xl px-5 md:px-8">
            <nav
              aria-label={t('faq.toc_title')}
              className="section-frame p-5 md:p-6"
              data-od-id="faq-index"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">
                  {t('faq.toc_title')}
                </p>
                <p className="cat-no">
                  <span className="cat-no__num">{String(FAQ_COUNT).padStart(2, '0')}</span> FAQ
                </p>
              </div>
              <ul className="flex flex-wrap gap-2">
                {categories.map((section, idx) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="glass-btn touch-target inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-foreground/80"
                    >
                      <span className="font-mono text-[11px] text-foreground/45">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="rule-line my-10 md:my-12">
              {t('faq.toc_title')}
            </div>

            <FaqSection
              categories={categories}
              allLabel={t('faq.all_label')}
              searchPlaceholder={t('faq.search_placeholder')}
              tocLabel={t('faq.toc_title')}
              clearSearchLabel={t('faq.search_clear')}
              filterLabel={t('faq.filter_label')}
              resultsFoundOne={t('faq.results_found_one')}
              resultsFoundOther={t('faq.results_found_other')}
              noResultsTitle={t('faq.no_results_title')}
              noResultsBody={t('faq.no_results_body')}
              expandAnswerLabel={t('faq.expand_answer')}
              collapseAnswerLabel={t('faq.collapse_answer')}
            />

            {faqFooter}
          </article>
        </main>
      </div>
    </>
  );
}
