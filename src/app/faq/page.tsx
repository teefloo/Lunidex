import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import FaqSection from '@/components/ui/FaqSection';
import {
  SITE_URL,
  SITE_NAME,
  GITHUB_ISSUES_URL,
} from '@/lib/site';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { HelpCircle, Mail, MessageCircleQuestion } from 'lucide-react';

type FaqLink = { href: string; label: string };
type FaqEntry = { id: string; q: string; a: string; links?: FaqLink[] };
type FaqCategory = { id: string; title: string; intro: string; entries: FaqEntry[] };

const LAST_UPDATED = '2026-09-01';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('faq.meta_title');
  const description = t('faq.meta_description');
  return {
    title,
    description,
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

  const routeLink = (path: string, labelKey: string): FaqLink => ({
    href: `/${lang}${path}`,
    label: t(labelKey),
  });

  const links = {
    about: routeLink('/about', 'about.heading'),
    pokedex: routeLink('/pokedex', 'footer.navigation.pokedex'),
    team: routeLink('/team', 'footer.navigation.team_builder'),
    compare: routeLink('/compare', 'compare.title'),
    types: routeLink('/types', 'footer.navigation.types'),
    quiz: routeLink('/quiz', 'footer.navigation.quiz'),
    nuzlocke: routeLink('/nuzlocke', 'nuzlocke.title'),
    tcg: routeLink('/tcg', 'footer.navigation.tcg'),
    collection: routeLink('/tcg/collection', 'tcg.nav_collection'),
    wishlist: routeLink('/tcg/wishlist', 'tcg.nav_wishlist'),
    deckBuilder: routeLink('/tcg/deck-builder', 'tcg.nav_deck_builder'),
    offline: routeLink('/offline', 'offline.title'),
    dashboard: routeLink('/dashboard', 'footer.navigation.dashboard'),
    privacy: routeLink('/privacy', 'footer.legal.privacy'),
    contact: routeLink('/contact', 'contact.title'),
  };

  const answer = (key: string) => t(key);

  const start: FaqEntry[] = [
    { id: 'what-is-lunidex', q: t('faq.q1'), a: answer('faq.a1'), links: [links.about] },
    { id: 'account-and-payment', q: t('faq.q2'), a: answer('faq.a2'), links: [links.dashboard] },
    { id: 'interface-languages', q: t('faq.q3'), a: answer('faq.a3') },
    { id: 'install-on-mobile', q: t('faq.q4'), a: answer('faq.a4'), links: [links.offline] },
  ];
  const tools: FaqEntry[] = [
    { id: 'pokemon-coverage', q: t('faq.q5'), a: answer('faq.a5'), links: [links.pokedex] },
    { id: 'team-builder', q: t('faq.q6'), a: answer('faq.a6'), links: [links.team] },
    { id: 'compare-pokemon', q: t('faq.q7'), a: answer('faq.a7'), links: [links.compare, links.types] },
    { id: 'pokemon-quiz', q: t('faq.q8'), a: answer('faq.a8'), links: [links.quiz] },
    { id: 'nuzlocke-tracker', q: t('faq.q9'), a: answer('faq.a9'), links: [links.nuzlocke] },
  ];
  const tcg: FaqEntry[] = [
    { id: 'tcg-catalog', q: t('faq.q10'), a: answer('faq.a10'), links: [links.tcg] },
    { id: 'tcg-collection', q: t('faq.q11'), a: answer('faq.a11'), links: [links.collection] },
    { id: 'tcg-wishlist-and-decks', q: t('faq.q12'), a: answer('faq.a12'), links: [links.wishlist, links.deckBuilder] },
    { id: 'tcg-prices', q: t('faq.q13'), a: answer('faq.a13'), links: [links.tcg] },
    { id: 'tcg-scanner-marketplace', q: t('faq.q14'), a: answer('faq.a14'), links: [links.about] },
  ];
  const support: FaqEntry[] = [
    { id: 'data-storage-and-sync', q: t('faq.q15'), a: answer('faq.a15'), links: [links.privacy, links.dashboard] },
    { id: 'offline-use', q: t('faq.q16'), a: answer('faq.a16'), links: [links.offline] },
    { id: 'export-and-delete', q: t('faq.q17'), a: answer('faq.a17'), links: [links.dashboard, links.privacy] },
    { id: 'contact-and-open-source', q: t('faq.q18'), a: answer('faq.a18'), links: [links.contact, links.about] },
  ];

  const categories: FaqCategory[] = [
    { id: 'start', title: t('faq.cat_start_title'), intro: t('faq.cat_start_intro'), entries: start },
    { id: 'tools', title: t('faq.cat_tools_title'), intro: t('faq.cat_tools_intro'), entries: tools },
    { id: 'tcg', title: t('faq.cat_tcg_title'), intro: t('faq.cat_tcg_intro'), entries: tcg },
    { id: 'support', title: t('faq.cat_support_title'), intro: t('faq.cat_support_intro'), entries: support },
  ];
  const allEntries = categories.flatMap((category) => category.entries);
  const faqCount = allEntries.length;
  const formattedLastUpdated = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(
    new Date(`${LAST_UPDATED}T00:00:00Z`),
  );
  const lastUpdatedLabel = t('faq.last_updated', {
    date: formattedLastUpdated,
    count: faqCount,
  });

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
    mainEntity: allEntries.map((entry) => ({
      '@type': 'Question',
      name: entry.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.a,
      },
    })),
  };

  const faqFooter = (
    <aside className="mt-16" data-od-id="faq-footer">
      <div className="editorial-ornament mb-6">
        <span aria-hidden="true" className="editorial-ornament__glyph">✦</span>
      </div>
      <div className="page-surface p-8 md:p-10 text-center">
        <p className="cat-no mb-3 text-center">
          <span className="cat-no__num">{String(faqCount).padStart(2, '0')}</span>
        </p>
        <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          {t('faq.still_questions_title')}
        </h2>
        <p className="mt-3 text-foreground/70 max-w-xl mx-auto">
          {t('faq.still_questions_body')}
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/${lang}/contact`}
            className="glass-btn glass-btn-active touch-target inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em]"
          >
            <Mail aria-hidden="true" className="h-3.5 w-3.5" />
            {t('faq.still_questions_cta_contact')}
          </Link>
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
            <FaqSection
              categories={categories}
              allLabel={t('faq.all_label')}
              searchPlaceholder={t('faq.search_placeholder')}
              categoryLabel={t('faq.toc_title')}
              relatedLinksLabel={t('faq.related_links_label')}
              clearSearchLabel={t('faq.search_clear')}
              filterLabel={t('faq.filter_label')}
              resultsFoundOne={t('faq.results_found_one')}
              resultsFoundOther={t('faq.results_found_other')}
              resultsSummary={t('faq.results_summary')}
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
