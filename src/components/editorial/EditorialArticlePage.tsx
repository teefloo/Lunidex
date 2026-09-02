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
import type { CompetitorArticleDefinition } from '@/lib/editorial';

type EditorialArticlePageProps = {
  article: CompetitorArticleDefinition;
  language: SupportedLanguage;
  t: TFunction;
  canonicalPath: string;
  publishedAt: string;
  publishedDate: string;
  lastUpdated: string;
  formattedDate: string;
};

export default function EditorialArticlePage({
  article,
  language,
  t,
  canonicalPath,
  publishedAt,
  publishedDate,
  lastUpdated,
  formattedDate,
}: EditorialArticlePageProps) {
  const key = `editorial.competitors.${article.slug.replaceAll('-', '_')}`;
  const text = (field: string) => t(`${key}.${field}`);
  const competitorName = text('name');
  const comparisonRows = article.comparisonRows ?? [];
  const pageUrl = `${SITE_URL}${canonicalPath}`;
  const faqs = [
    { question: text('faq_q1'), answer: text('faq_a1') },
    { question: text('faq_q2'), answer: text('faq_a2') },
  ];

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: SITE_NAME, path: '/' },
    { name: t('blog.nav_label'), path: '/blog' },
    { name: text('nav_label'), path: article.path },
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
      about: `${SITE_NAME} and ${competitorName}`,
      keywords: `${SITE_NAME} vs ${competitorName}, ${competitorName} alternative, Pokémon tools comparison`,
    }),
    articleSection: t('editorial.article.eyebrow'),
    citation: [
      { '@type': 'WebPage', name: t('editorial.article.source_lunidex'), url: GITHUB_REPO_URL },
      ...article.sources.map((source) => ({ '@type': 'WebPage', name: source.label, url: source.url })),
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
              <p className="page-eyebrow justify-center">{t('editorial.article.eyebrow')}</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-6xl">{text('heading')}</h1>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-foreground/70 md:text-lg">{text('intro')}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-foreground/45">
                <time dateTime={publishedAt}>{t('blog.published', { date: publishedDate })}</time>
                <span aria-hidden="true"> · </span>
                <time dateTime={lastUpdated}>{t('editorial.article.checked', { date: formattedDate })}</time>
              </p>
            </header>

            <section className="mx-auto mt-12 max-w-4xl rounded-sm border border-primary/30 bg-primary/5 p-6 md:p-8" aria-labelledby="editorial-article-answer-title">
              <h2 id="editorial-article-answer-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.article.answer_title')}
              </h2>
              <p className="mt-4 text-base leading-8 text-foreground/80">{text('answer')}</p>
            </section>

            <section className="mx-auto mt-10 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="editorial-article-scope-title">
              <h2 id="editorial-article-scope-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.article.scope_title', { name: competitorName })}
              </h2>
              <p className="mt-4 leading-7 text-foreground/75">{text('scope')}</p>
            </section>

            {comparisonRows.length > 0 ? (
              <section className="mx-auto mt-10 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="editorial-article-matrix-title">
                <h2 id="editorial-article-matrix-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                  {t('editorial.article.matrix_title')}
                </h2>
                <div className="mt-5 overflow-x-auto rounded-sm border border-border/60">
                  <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                    <thead className="bg-card/60 text-xs uppercase tracking-[0.12em] text-foreground/55">
                      <tr>
                        <th scope="col" className="border-b border-border/60 px-4 py-3 font-black">{t('editorial.article.matrix_criterion')}</th>
                        <th scope="col" className="border-b border-border/60 px-4 py-3 font-black">Lunidex</th>
                        <th scope="col" className="border-b border-border/60 px-4 py-3 font-black">{competitorName}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row) => (
                        <tr key={row} className="align-top even:bg-card/25">
                          <th scope="row" className="border-b border-border/40 px-4 py-3 font-bold text-foreground/75">{text(`matrix.${row}.label`)}</th>
                          <td className="border-b border-border/40 px-4 py-3 leading-6 text-foreground/70">{text(`matrix.${row}.lunidex`)}</td>
                          <td className="border-b border-border/40 px-4 py-3 leading-6 text-foreground/70">{text(`matrix.${row}.competitor`)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs leading-6 text-foreground/55">{t('editorial.article.matrix_note')}</p>
              </section>
            ) : null}

            <section className="mt-10 grid gap-8 lg:grid-cols-2" aria-label={t('editorial.article.difference_title')}>
              <div className="section-frame p-6 md:p-8">
                <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t('editorial.article.shared_title')}</h2>
                <p className="mt-4 leading-7 text-foreground/75">{text('shared')}</p>
              </div>
              <div className="section-frame p-6 md:p-8">
                <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t('editorial.article.difference_title')}</h2>
                <p className="mt-4 leading-7 text-foreground/75">{text('difference')}</p>
              </div>
            </section>

            <section className="mx-auto mt-10 max-w-4xl rounded-sm border border-border/60 bg-card/30 p-6 md:p-8" aria-labelledby="editorial-article-fit-title">
              <h2 id="editorial-article-fit-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.article.fit_title')}
              </h2>
              <p className="mt-4 leading-7 text-foreground/75">{text('fit')}</p>
            </section>

            <section className="mx-auto mt-10 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="editorial-article-faq-title">
              <h2 id="editorial-article-faq-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.article.faq_title', { name: competitorName })}
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

            <section className="mx-auto mt-10 max-w-4xl border-t border-border/60 pt-8" aria-labelledby="editorial-article-sources-title">
              <h2 id="editorial-article-sources-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('editorial.article.sources_title')}
              </h2>
              <p className="mt-4 text-sm leading-7 text-foreground/70">{t('editorial.article.checked', { date: formattedDate })}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                  {t('editorial.article.source_lunidex')}
                </a>
                {article.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                    {source.label}
                  </a>
                ))}
              </div>
            </section>

            <nav className="mx-auto mt-10 max-w-4xl border-t border-border/60 pt-8" aria-label={t('editorial.article.fit_title')}>
              <div className="flex flex-wrap gap-3">
                <Link href={localeHref(article.productPath, language)} className="glass-btn glass-btn-active touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('editorial.article.open_tool')}
                </Link>
                <Link href={localeHref('/blog', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('editorial.article.back_blog')}
                </Link>
              </div>
            </nav>
          </article>
        </main>
      </div>
    </>
  );
}
