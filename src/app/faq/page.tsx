import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { SITE_URL, SITE_NAME, GITHUB_REPO_URL, GITHUB_ISSUES_URL } from '@/lib/site';
import { buildBreadcrumbJsonLd, buildSubpathLanguages } from '@/lib/seo';
import { HelpCircle, Github, MessageCircleQuestion } from 'lucide-react';

type FaqEntry = { q: string; a: string };

const LAST_UPDATED = '2026-06-05';
const FAQ_COUNT = 12;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

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

  const data: FaqEntry[] = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
  ];
  const features: FaqEntry[] = [
    { q: t('faq.q5'), a: t('faq.a5') },
    { q: t('faq.q6'), a: t('faq.a6') },
    { q: t('faq.q7'), a: t('faq.a7') },
    { q: t('faq.q8'), a: t('faq.a8') },
  ];
  const privacy: FaqEntry[] = [
    { q: t('faq.q9'), a: t('faq.a9') },
    { q: t('faq.q10'), a: t('faq.a10') },
    { q: t('faq.q11'), a: t('faq.a11') },
    { q: t('faq.q12'), a: t('faq.a12') },
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
    datePublished: LAST_UPDATED,
    dateModified: LAST_UPDATED,
    primaryImageOfPage: { '@type': 'ImageObject', url: `${baseUrl}/opengraph-image` },
    mainEntity: [...data, ...features, ...privacy].map((entry) => ({
      '@type': 'Question',
      name: entry.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.a,
      },
    })),
  };

  const sections = [
    { id: 'data', title: t('faq.cat_data_title'), intro: t('faq.cat_data_intro'), entries: data },
    { id: 'features', title: t('faq.cat_features_title'), intro: t('faq.cat_features_intro'), entries: features },
    { id: 'privacy', title: t('faq.cat_privacy_title'), intro: t('faq.cat_privacy_intro'), entries: privacy },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="app-page">
        <Header />
        <main className="page-shell pt-28 pb-24 relative">
          <PageHeader
            icon={HelpCircle}
            title={t('faq.heading')}
            subtitle={t('faq.subtitle')}
            eyebrow={t('faq.eyebrow')}
            centered
            className="mb-12"
            badge={
              <p className="cat-no whitespace-nowrap hidden sm:block">
                Cat. No. <span className="cat-no__num">FAQ</span>
                <span className="mx-1.5 text-foreground/30">·</span>
                Updated {LAST_UPDATED}
              </p>
            }
          />

          <article className="mx-auto w-full max-w-4xl px-5 md:px-8">
            <nav
              aria-label={t('faq.toc_title')}
              className="section-frame p-5 md:p-6"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">
                  {t('faq.toc_title')}
                </p>
                <p className="cat-no">
                  <span className="cat-no__num">{String(FAQ_COUNT).padStart(2, '0')}</span> entries
                </p>
              </div>
              <ul className="flex flex-wrap gap-2">
                {sections.map((section, idx) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-3 py-1.5 text-sm font-semibold text-foreground/80 hover:border-primary hover:text-primary transition-colors"
                    >
                      <span className="font-mono text-[10px] text-foreground/45">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="rule-line my-10 md:my-12">
              FAQ · Chapter Index
            </div>

            <div className="space-y-14">
              {sections.map((section, secIdx) => {
                const chapterLabel = ROMAN[secIdx] ?? String(secIdx + 1);
                return (
                  <section
                    key={section.id}
                    id={section.id}
                    aria-labelledby={`${section.id}-title`}
                    className="scroll-mt-28"
                  >
                    <header className="mb-6 border-b border-dashed border-foreground/15 pb-4">
                      <p className="cat-no mb-2">
                        Chapter <span className="cat-no__num">{chapterLabel}</span>
                        <span className="mx-1.5 text-foreground/30">·</span>
                        {section.entries.length} {section.entries.length === 1 ? 'entry' : 'entries'}
                      </p>
                      <h2
                        id={`${section.id}-title`}
                        className="text-2xl md:text-3xl font-extrabold tracking-tight"
                      >
                        {section.title}
                      </h2>
                      <p className="mt-2 text-foreground/70 leading-relaxed max-w-2xl">
                        {section.intro}
                      </p>
                    </header>

                    <div className="space-y-4">
                      {section.entries.map((entry, qIdx) => {
                        const qNumber = secIdx * 4 + qIdx + 1;
                        const qStr = String(qNumber).padStart(3, '0');
                        const headingId = `${section.id}-q${qIdx + 1}`;
                        return (
                          <article
                            key={headingId}
                            aria-labelledby={headingId}
                            className="section-frame p-5 md:p-7 transition-colors"
                          >
                            <div className="flex items-start gap-4 md:gap-6">
                              <span className="cat-no flex-none pt-1 hidden sm:inline-block">
                                Q.<span className="cat-no__num">{qStr}</span>
                              </span>
                              <div className="min-w-0 flex-1">
                                <h3
                                  id={headingId}
                                  className="text-lg md:text-xl font-bold tracking-tight"
                                >
                                  {entry.q}
                                </h3>
                                <p className="mt-3 text-foreground/80 leading-relaxed">
                                  {entry.a}
                                </p>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            <aside className="mt-16">
              <div className="editorial-ornament mb-6">
                <span className="editorial-ornament__glyph">epilogue</span>
              </div>
              <div className="page-surface p-8 md:p-10 text-center">
                <p className="cat-no text-center mb-3">
                  End of Document
                </p>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  <span className="gradient-text-hero">{t('faq.still_questions_title')}</span>
                </h2>
                <p className="mt-3 text-foreground/70 max-w-xl mx-auto">
                  {t('faq.still_questions_body')}
                </p>
                <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-primary-foreground shadow-[0_14px_34px_-24px_color-mix(in_oklab,var(--primary)_55%,transparent)] hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <Github className="w-3.5 h-3.5" />
                    {t('faq.still_questions_cta_github')}
                  </a>
                  <a
                    href={GITHUB_ISSUES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/70 backdrop-blur-xl px-5 py-3 text-xs font-black uppercase tracking-[0.18em] hover:-translate-y-0.5 hover:border-primary/25 transition-all duration-200"
                  >
                    <MessageCircleQuestion className="w-3.5 h-3.5" />
                    {t('faq.still_questions_cta_issues')}
                  </a>
                </div>
              </div>
            </aside>
          </article>
        </main>
      </div>
    </>
  );
}
