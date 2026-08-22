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
import type { FeatureGuideDefinition } from '@/lib/editorial';

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
  const pageUrl = `${SITE_URL}${canonicalPath}`;
  const faqs = [
    { question: text('faq_q1'), answer: text('faq_a1') },
    { question: text('faq_q2'), answer: text('faq_a2') },
  ];

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
    citation: [
      { '@type': 'WebPage', name: t('editorial.guide.source_lunidex'), url: GITHUB_REPO_URL },
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

            <section className="mx-auto mt-10 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="editorial-guide-scope-title">
              <h2 id="editorial-guide-scope-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.guide.scope_title')}
              </h2>
              <p className="mt-4 leading-7 text-foreground/75">{text('scope')}</p>
            </section>

            <section className="mx-auto mt-10 max-w-4xl" aria-labelledby="editorial-guide-steps-title">
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

            <section className="mx-auto mt-10 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="editorial-guide-limits-title">
              <h2 id="editorial-guide-limits-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.guide.limits_title')}
              </h2>
              <p className="mt-4 leading-7 text-foreground/75">{text('limits')}</p>
            </section>

            <section className="mx-auto mt-10 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="editorial-guide-faq-title">
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

            <section className="mx-auto mt-10 max-w-4xl border-t border-border/60 pt-8" aria-labelledby="editorial-guide-sources-title">
              <h2 id="editorial-guide-sources-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.guide.sources_title')}
              </h2>
              <p className="mt-4 text-sm leading-7 text-foreground/70">{t('editorial.guide.checked', { date: formattedDate })}</p>
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex text-sm font-bold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                {t('editorial.guide.source_lunidex')}
              </a>
            </section>

            <nav className="mx-auto mt-10 max-w-4xl border-t border-border/60 pt-8" aria-label={t('editorial.guide.steps_title')}>
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
          </article>
        </main>
      </div>
    </>
  );
}
