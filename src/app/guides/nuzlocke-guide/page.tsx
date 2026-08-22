import type { Metadata } from 'next';
import Link from 'next/link';

import Header from '@/components/layout/Header';
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

const PAGE_PATH = '/guides/nuzlocke-guide';
const { publishedAt: PUBLISHED_AT, updatedAt: LAST_UPDATED } = getEditorialDates(PAGE_PATH);
const POKEAPI_SOURCE = 'https://pokeapi.co';

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const title = t('nuzlocke_guide.meta_title');
  const description = t('nuzlocke_guide.meta_description');
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

export default async function NuzlockeGuide() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const localizedPath = localeHref(PAGE_PATH, language);
  const pageUrl = `${SITE_URL}${localizedPath}`;
  const dateFormatter = new Intl.DateTimeFormat(buildInLanguage(language), {
    dateStyle: 'medium',
  });
  const formattedDate = dateFormatter.format(new Date(`${LAST_UPDATED}T00:00:00Z`));
  const formattedPublishedDate = dateFormatter.format(new Date(`${PUBLISHED_AT}T00:00:00Z`));

  const tips = [t('nuzlocke_guide.tip1'), t('nuzlocke_guide.tip2'), t('nuzlocke_guide.tip3')];

  const faqs = [
    { question: t('nuzlocke_guide.faq_q1'), answer: t('nuzlocke_guide.faq_a1') },
    { question: t('nuzlocke_guide.faq_q2'), answer: t('nuzlocke_guide.faq_a2') },
    { question: t('nuzlocke_guide.faq_q3'), answer: t('nuzlocke_guide.faq_a3') },
    { question: t('nuzlocke_guide.faq_q4'), answer: t('nuzlocke_guide.faq_a4') },
  ];

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: SITE_NAME, path: '/' },
    { name: t('blog.nav_label'), path: '/blog' },
    { name: t('nuzlocke_guide.nav_label'), path: PAGE_PATH },
  ], language);
  const pageJsonLd = {
    ...buildArticleJsonLd({
      lang: language,
      path: localizedPath,
      name: t('nuzlocke_guide.meta_title'),
      headline: t('nuzlocke_guide.heading'),
      description: t('nuzlocke_guide.meta_description'),
      datePublished: PUBLISHED_AT,
      dateModified: LAST_UPDATED,
      about: 'Nuzlocke challenge tracking',
      keywords: 'Nuzlocke tracker, Nuzlocke run, challenge tracker, encounter log, Pokémon challenge',
    }),
    articleSection: t('nuzlocke_guide.eyebrow'),
    citation: [
      { '@type': 'WebPage', name: 'Lunidex source repository', url: GITHUB_REPO_URL },
      { '@type': 'WebPage', name: 'PokéAPI', url: POKEAPI_SOURCE },
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
              <p className="page-eyebrow justify-center">{t('nuzlocke_guide.eyebrow')}</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-6xl">
                {t('nuzlocke_guide.heading')}
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-foreground/70 md:text-lg">
                {t('nuzlocke_guide.intro')}
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-foreground/45">
                <time dateTime={PUBLISHED_AT}>{t('blog.published', { date: formattedPublishedDate })}</time>
                <span aria-hidden="true"> · </span>
                <time dateTime={LAST_UPDATED}>{t('nuzlocke_guide.updated', { date: formattedDate })}</time>
              </p>
            </header>

            <section className="mx-auto mt-12 max-w-4xl rounded-sm border border-primary/30 bg-primary/5 p-6 md:p-8" aria-labelledby="nuzlocke-guide-answer-title">
              <h2 id="nuzlocke-guide-answer-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('nuzlocke_guide.answer_title')}
              </h2>
              <p className="mt-4 text-base leading-8 text-foreground/80">
                {t('nuzlocke_guide.answer_body')}
              </p>
            </section>

            <section className="mt-12" aria-labelledby="nuzlocke-guide-how-title">
              <div className="mx-auto max-w-3xl text-center">
                <h2 id="nuzlocke-guide-how-title" className="text-3xl font-extrabold tracking-tight md:text-4xl">
                  {t('nuzlocke_guide.how_title')}
                </h2>
                <p className="mt-4 leading-7 text-foreground/70">{t('nuzlocke_guide.how_intro')}</p>
              </div>
              <ol className="mt-8 grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((step) => (
                  <li key={step} className="section-frame flex gap-4 p-5">
                    <span className="font-mono text-sm font-bold text-primary">0{step}</span>
                    <p className="leading-7 text-foreground/75">{t(`nuzlocke_guide.step${step}`)}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mx-auto mt-12 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="nuzlocke-guide-tips-title">
              <h2 id="nuzlocke-guide-tips-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('nuzlocke_guide.tips_title')}
              </h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-foreground/75">
                {tips.map((tip) => (
                  <li key={tip}>• {tip}</li>
                ))}
              </ul>
            </section>

            <section className="mx-auto mt-12 max-w-4xl section-frame p-6 md:p-8" aria-labelledby="nuzlocke-guide-faq-title">
              <h2 id="nuzlocke-guide-faq-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('nuzlocke_guide.faq_title')}
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

            <section className="mx-auto mt-12 max-w-4xl border-t border-border/60 pt-8" aria-labelledby="nuzlocke-guide-sources-title">
              <h2 id="nuzlocke-guide-sources-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('nuzlocke_guide.sources_title')}
              </h2>
              <p className="mt-4 leading-7 text-foreground/70">{t('nuzlocke_guide.sources_body')}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                  {t('nuzlocke_guide.source_lunidex')}
                </a>
                <a href={POKEAPI_SOURCE} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                  PokéAPI
                </a>
              </div>
            </section>

            <nav className="mx-auto mt-10 max-w-4xl" aria-label={t('nuzlocke_guide.cta_title')}>
              <p className="page-eyebrow">{t('nuzlocke_guide.cta_title')}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={localeHref('/nuzlocke', language)} className="glass-btn glass-btn-active touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('nuzlocke_guide.cta_app')}
                </Link>
                <Link href={localeHref('/blog', language)} className="glass-btn touch-target inline-flex items-center px-4 py-3 text-sm font-bold">
                  {t('nuzlocke_guide.cta_blog')}
                </Link>
              </div>
            </nav>
          </article>
        </main>
      </div>
    </>
  );
}
