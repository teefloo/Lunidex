import type { TFunction } from 'i18next';
import Link from 'next/link';

import Header from '@/components/layout/Header';
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildInLanguage,
  localeHref,
} from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { GITHUB_REPO_URL, SITE_NAME, SITE_URL } from '@/lib/site';
import type { SupportedLanguage } from '@/lib/languages';
import type { FeatureGuideDefinition, GuideEvidenceRowKey } from '@/lib/editorial';

const evidenceTranslationKeys: Record<GuideEvidenceRowKey, string> = {
  cardEstimate: 'card_estimate',
  sealedPortfolio: 'sealed_portfolio',
  priceHistory: 'price_history',
  sourceFreshness: 'source_freshness',
  marketLimits: 'market_limits',
};

type EditorialGuidePageProps = {
  guide: FeatureGuideDefinition;
  language: SupportedLanguage;
  t: TFunction;
  canonicalPath: string;
  publishedAt: string;
  publishedDate: string;
  lastUpdated: string;
  formattedDate: string;
};

export default function EditorialGuidePage({
  guide,
  language,
  t,
  canonicalPath,
  publishedAt,
  publishedDate,
  lastUpdated,
  formattedDate,
}: EditorialGuidePageProps) {
  const guideTranslationKey = guide.slug.replace(/-guide$/, '').replaceAll('-', '_');
  const key = `editorial.guides.${guideTranslationKey}`;
  const text = (field: string) => t(`${key}.${field}`);
  const relatedLinkLabels: Record<string, string> = {
    '/guides/pokemon-card-collection-tracker': t('editorial.article.related_collection_guide'),
    '/guides/tcg-workspace-guide': t('editorial.article.related_tcg_guide'),
    '/guides/pokemon-card-collection-value': t('editorial.article.related_value_guide', {
      defaultValue: 'Read the collection value guide',
    }),
    '/compare/lunidex-vs-cardmarket': t('editorial.article.related_cardmarket_compare', {
      defaultValue: 'Read the Lunidex vs Cardmarket comparison',
    }),
  };
  const pageUrl = `${SITE_URL}${canonicalPath}`;
  const faqs = [
    { question: text('faq_q1'), answer: text('faq_a1') },
    { question: text('faq_q2'), answer: text('faq_a2') },
    ...(guide.faqCount === 4
      ? [
          { question: text('faq_q3'), answer: text('faq_a3') },
          { question: text('faq_q4'), answer: text('faq_a4') },
        ]
      : []),
  ];
  const sourceLinks = [
    { label: t('editorial.guide.source_lunidex'), url: GITHUB_REPO_URL },
    ...(guide.sources ?? []),
  ];
  const evidenceRows = (guide.evidenceRows ?? []).map((row) => {
    const translationKey = evidenceTranslationKeys[row];
    return {
      label: text(`evidence_${translationKey}_label`),
      value: text(`evidence_${translationKey}_value`),
    };
  });

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: SITE_NAME, path: '/' },
    { name: t('blog.nav_label'), path: '/blog' },
    { name: text('nav_label'), path: guide.path },
  ], language);
  const pageJsonLd = {
    ...buildArticleJsonLd({
      lang: language,
      path: canonicalPath,
      name: text('meta_title'),
      headline: text('heading'),
      description: text('meta_description'),
      datePublished: publishedAt,
      dateModified: lastUpdated,
      about: `Lunidex ${text('nav_label')}`,
      keywords: `${text('heading')}, Lunidex guide, Pokémon tools guide`,
    }),
    articleSection: t('editorial.guide.eyebrow'),
    citation: sourceLinks.map((source) => ({ '@type': 'WebPage', name: source.label, url: source.url })),
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
        <main className="page-shell relative pb-24 pt-28">
          <article className="mx-auto w-full max-w-5xl px-5 md:px-8">
            <header className="mx-auto max-w-4xl text-center">
              <p className="page-eyebrow justify-center">{t('editorial.guide.eyebrow')}</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-6xl">{text('heading')}</h1>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-foreground/70 md:text-lg">{text('intro')}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-foreground/45">
                <time dateTime={publishedAt}>{t('blog.published', { date: publishedDate })}</time>
                <span aria-hidden="true"> · </span>
                <time dateTime={lastUpdated}>{t('editorial.guide.checked', { date: formattedDate })}</time>
              </p>
            </header>

            <section className="mx-auto mt-12 max-w-4xl rounded-sm border border-primary/30 bg-primary/5 p-6 md:p-8" aria-labelledby="editorial-guide-answer-title">
              <h2 id="editorial-guide-answer-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.guide.answer_title')}
              </h2>
              <p className="mt-4 text-base leading-8 text-foreground/80">{text('answer')}</p>
            </section>

            <section className="editorial-below-fold mx-auto mt-10 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="editorial-guide-scope-title">
              <h2 id="editorial-guide-scope-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.guide.scope_title')}
              </h2>
              <p className="mt-4 leading-7 text-foreground/75">{text('scope')}</p>
            </section>

            {evidenceRows.length > 0 ? (
              <section className="editorial-below-fold mx-auto mt-10 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="editorial-guide-evidence-title">
                <h2 id="editorial-guide-evidence-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                  {text('evidence_title')}
                </h2>
                <p className="mt-4 leading-7 text-foreground/75">{text('evidence_intro')}</p>
                <div className="mt-5 overflow-x-auto rounded-sm border border-border/60">
                  <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                    <caption className="sr-only">{text('evidence_title')}</caption>
                    <thead className="bg-card/60 text-xs uppercase tracking-[0.12em] text-foreground/55">
                      <tr>
                        <th scope="col" className="border-b border-border/60 px-4 py-3 font-black">{t('editorial.article.matrix_criterion')}</th>
                        <th scope="col" className="border-b border-border/60 px-4 py-3 font-black">{SITE_NAME}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceRows.map((row) => (
                        <tr key={row.label} className="align-top even:bg-card/25">
                          <th scope="row" className="border-b border-border/40 px-4 py-3 font-bold text-foreground/75">{row.label}</th>
                          <td className="border-b border-border/40 px-4 py-3 leading-6 text-foreground/70">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            <section className="editorial-below-fold mx-auto mt-10 max-w-4xl" aria-labelledby="editorial-guide-steps-title">
              <h2 id="editorial-guide-steps-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.guide.steps_title')}
              </h2>
              <ol className="mt-6 grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((step) => (
                  <li key={step} className="section-frame flex gap-4 p-5">
                    <span className="font-mono text-sm font-bold text-primary">0{step}</span>
                    <p className="leading-7 text-foreground/75">{text(`step${step}`)}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="editorial-below-fold mx-auto mt-10 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="editorial-guide-limits-title">
              <h2 id="editorial-guide-limits-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.guide.limits_title')}
              </h2>
              <p className="mt-4 leading-7 text-foreground/75">{text('limits')}</p>
            </section>

            <section className="editorial-below-fold mx-auto mt-10 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="editorial-guide-faq-title">
              <h2 id="editorial-guide-faq-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.guide.faq_title')}
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

            <section className="editorial-below-fold mx-auto mt-10 max-w-4xl border-t border-border/60 pt-8" aria-labelledby="editorial-guide-sources-title">
              <h2 id="editorial-guide-sources-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.guide.sources_title')}
              </h2>
              <p className="mt-4 text-sm leading-7 text-foreground/70">{t('editorial.guide.checked', { date: formattedDate })}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
                {sourceLinks.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                    {source.label}
                  </a>
                ))}
              </div>
            </section>

            <nav className="editorial-below-fold mx-auto mt-10 max-w-4xl border-t border-border/60 pt-8" aria-label={t('editorial.guide.steps_title')}>
              <div className="flex flex-wrap gap-3">
                {guide.productPaths.map((path) => (
                  <Link key={path} href={localeHref(path, language)} className="glass-btn glass-btn-active touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                    {t('editorial.guide.open_tool')}: {path.replace(/^\//, '')}
                  </Link>
                ))}
                <Link href={localeHref('/blog', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('editorial.guide.back_blog')}
                </Link>
              </div>
            </nav>

            {guide.relatedPaths?.length ? (
              <nav className="editorial-below-fold mx-auto mt-8 max-w-4xl border-t border-border/60 pt-8" aria-label={t('editorial.article.related_title')}>
                <p className="page-eyebrow">{t('editorial.article.related_title')}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {guide.relatedPaths.map((path) => (
                    <Link key={path} href={localeHref(path, language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                      {relatedLinkLabels[path] ?? path}
                    </Link>
                  ))}
                </div>
              </nav>
            ) : null}
          </article>
        </main>
      </div>
    </>
  );
}
