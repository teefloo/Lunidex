import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import Anniversary30Tracker from '@/components/anniversary/Anniversary30Tracker';
import Header from '@/components/layout/Header';
import {
  ANNIVERSARY_30_INDEXABLE_LANGUAGES,
  ANNIVERSARY_30_HERO_IMAGE,
  ANNIVERSARY_30_LAST_MODIFIED_DATE,
  ANNIVERSARY_30_PATH,
  ANNIVERSARY_30_PRODUCTS,
  ANNIVERSARY_30_PUBLICATION_DATE,
  ANNIVERSARY_30_SOURCES,
  getAnniversary30Language,
  isAnniversary30Language,
} from '@/lib/anniversary-30';
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildInLanguage,
  buildLocalizedLanguages,
  localeHref,
} from '@/lib/seo';
import { getServerLanguage, getServerTForLanguage } from '@/lib/server-i18n';
import { serializeJsonLd } from '@/lib/json-ld';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const revalidate = 86400;

const FACT_KEYS = ['release', 'booster', 'pikachu', 'pikachu_ex', 'foil', 'classic'] as const;

async function getPageContext() {
  const requestedLanguage = await getServerLanguage();
  const language = getAnniversary30Language(requestedLanguage);
  const t = getServerTForLanguage(language);
  const localizedPath = localeHref(ANNIVERSARY_30_PATH, language);

  return { requestedLanguage, language, t, localizedPath };
}

export async function generateMetadata(): Promise<Metadata> {
  const { requestedLanguage, language, t, localizedPath } = await getPageContext();
  const title = t('anniversary_30.meta_title');
  const description = t('anniversary_30.meta_description');
  const indexable = isAnniversary30Language(requestedLanguage);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: localizedPath,
      languages: buildLocalizedLanguages(ANNIVERSARY_30_PATH, ANNIVERSARY_30_INDEXABLE_LANGUAGES),
    },
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: 'games',
    robots: {
      index: indexable,
      follow: true,
      noimageindex: false,
      googleBot: {
        index: indexable,
        follow: true,
        noimageindex: false,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title,
      description,
      url: localizedPath,
      type: 'article',
      siteName: SITE_NAME,
      locale: buildInLanguage(language),
      publishedTime: ANNIVERSARY_30_PUBLICATION_DATE,
      modifiedTime: ANNIVERSARY_30_LAST_MODIFIED_DATE,
      images: [{ url: ANNIVERSARY_30_HERO_IMAGE.url[language], alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ANNIVERSARY_30_HERO_IMAGE.url[language]],
    },
  };
}

export default async function Anniversary30Page() {
  const { requestedLanguage, language, t, localizedPath } = await getPageContext();

  if (!isAnniversary30Language(requestedLanguage)) {
    redirect(localeHref(ANNIVERSARY_30_PATH, 'en'));
  }

  const pageUrl = `${SITE_URL}${localizedPath}`;
  const facts = FACT_KEYS.map((key) => ({
    id: key,
    title: t(`anniversary_30.facts.${key}_title`),
    body: t(`anniversary_30.facts.${key}_body`),
  }));
  const faqs = [1, 2, 3, 4, 5, 6].map((number) => ({
    question: t(`anniversary_30.faq_q${number}`),
    answer: t(`anniversary_30.faq_a${number}`),
  }));
  const confirmedProducts = ANNIVERSARY_30_PRODUCTS.filter((product) => product.sourceStatus === 'confirmed');
  const productGroups = [
    {
      id: 'launch',
      label: t('anniversary_30.products.window_launch'),
      products: confirmedProducts.filter((product) => product.availabilityGroup === 'launch'),
    },
    {
      id: 'q3',
      label: t('anniversary_30.products.window_q3'),
      products: confirmedProducts.filter((product) => product.availabilityGroup === 'q3'),
    },
    {
      id: 'q4',
      label: t('anniversary_30.products.window_q4'),
      products: confirmedProducts.filter((product) => product.availabilityGroup === 'q4'),
    },
  ];

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: SITE_NAME, path: '/' },
    { name: t('anniversary_30.nav_label'), path: ANNIVERSARY_30_PATH },
  ], language);
  const articleJsonLd = {
    ...buildArticleJsonLd({
      lang: language,
      path: localizedPath,
      name: t('anniversary_30.meta_title'),
      headline: t('anniversary_30.heading'),
      description: t('anniversary_30.meta_description'),
      datePublished: ANNIVERSARY_30_PUBLICATION_DATE,
      dateModified: ANNIVERSARY_30_LAST_MODIFIED_DATE,
      about: t('anniversary_30.nav_label'),
    }),
    image: [ANNIVERSARY_30_HERO_IMAGE.url[language]],
    articleSection: t('anniversary_30.eyebrow'),
    citation: ANNIVERSARY_30_SOURCES.map((source) => ({
      '@type': 'WebPage',
      name: t(source.nameKey),
      url: source.url,
    })),
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
  const productListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${pageUrl}#products`,
    url: pageUrl,
    name: t('anniversary_30.products_title'),
    inLanguage: buildInLanguage(language),
    itemListElement: confirmedProducts.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: t(product.nameKey),
        description: t(product.descriptionKey),
        image: [product.imageUrl[language]],
        url: product.sourceUrl,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({ '@graph': [articleJsonLd, breadcrumb, faqJsonLd, productListJsonLd] }),
        }}
      />
      <div className="app-page">
        <Header />
        <main className="page-shell relative pb-24 pt-28">
          <article className="mx-auto w-full max-w-6xl px-5 md:px-8" aria-labelledby="anniversary-30-title">
            <header className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className="text-center lg:text-left">
                <p className="page-eyebrow justify-center lg:justify-start">{t('anniversary_30.eyebrow')}</p>
                <h1 id="anniversary-30-title" className="mt-3 text-4xl font-extrabold tracking-tight md:text-6xl">
                  {t('anniversary_30.heading')}
                </h1>
                <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-foreground/70 md:text-lg lg:mx-0">
                  {t('anniversary_30.intro')}
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  <Link href="#tracker" className="glass-btn glass-btn-active touch-target px-5 py-3 text-sm font-bold">
                    {t('anniversary_30.cta_tracker')}
                  </Link>
                  <Link href={localeHref('/tcg', language)} className="glass-btn touch-target px-5 py-3 text-sm font-bold">
                    {t('anniversary_30.cta_tcg')}
                  </Link>
                </div>
                <div className="mx-auto mt-8 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-sm border border-primary/25 bg-primary/5 px-5 py-3 text-sm font-bold lg:mx-0">
                  <span>{t('anniversary_30.release_label')}</span>
                  <time dateTime="2026-09-16" className="text-primary">{t('anniversary_30.release_date')}</time>
                </div>
              </div>
              <figure className="order-first overflow-hidden rounded-sm border border-primary/30 bg-primary/10 shadow-2xl shadow-primary/10 lg:order-none">
                <div className="relative aspect-[16/10]">
                  <Image
                    src={ANNIVERSARY_30_HERO_IMAGE.url[language]}
                    alt={t('anniversary_30.hero_image_alt')}
                    fill
                    priority
                    sizes="(min-width: 1024px) 55vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-foreground/55">
                  <span>{t('anniversary_30.hero_image_caption')}</span>
                  <a href={ANNIVERSARY_30_HERO_IMAGE.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                    {t('anniversary_30.source_link_label')}
                  </a>
                </figcaption>
              </figure>
            </header>

            <nav className="mx-auto mt-10 max-w-5xl rounded-sm border border-border/70 bg-background/50 p-5" aria-label={t('anniversary_30.toc_label')}>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-foreground/55">{t('anniversary_30.toc_label')}</p>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold">
                <li><Link href="#summary" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{t('anniversary_30.toc_summary')}</Link></li>
                <li><Link href="#pikachu" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{t('anniversary_30.toc_pikachu')}</Link></li>
                <li><Link href="#tracker" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{t('anniversary_30.toc_tracker')}</Link></li>
                <li><Link href="#products" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{t('anniversary_30.toc_products')}</Link></li>
                <li><Link href="#faq" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{t('anniversary_30.toc_faq')}</Link></li>
                <li><Link href="#sources" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{t('anniversary_30.toc_sources')}</Link></li>
              </ul>
            </nav>

            <section id="summary" className="mx-auto mt-10 max-w-5xl scroll-mt-28 rounded-sm border border-primary/30 bg-primary/5 p-6 md:p-8" aria-labelledby="anniversary-answer-title">
              <h2 id="anniversary-answer-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('anniversary_30.answer_title')}
              </h2>
              <p className="mt-4 max-w-4xl text-base leading-8 text-foreground/80">
                {t('anniversary_30.answer_body')}
              </p>
              <dl className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-sm border border-border/70 bg-background/55 p-4">
                  <dt className="text-xs font-extrabold uppercase tracking-[0.12em] text-foreground/55">{t('anniversary_30.quick_fact_release_label')}</dt>
                  <dd className="mt-2 font-extrabold text-primary"><time dateTime="2026-09-16">{t('anniversary_30.release_date')}</time></dd>
                </div>
                <div className="rounded-sm border border-border/70 bg-background/55 p-4">
                  <dt className="text-xs font-extrabold uppercase tracking-[0.12em] text-foreground/55">{t('anniversary_30.quick_fact_pikachu_label')}</dt>
                  <dd className="mt-2 font-extrabold">{t('anniversary_30.quick_fact_pikachu_value')}</dd>
                </div>
                <div className="rounded-sm border border-border/70 bg-background/55 p-4">
                  <dt className="text-xs font-extrabold uppercase tracking-[0.12em] text-foreground/55">{t('anniversary_30.quick_fact_booster_label')}</dt>
                  <dd className="mt-2 font-extrabold">{t('anniversary_30.quick_fact_booster_value')}</dd>
                </div>
                <div className="rounded-sm border border-border/70 bg-background/55 p-4">
                  <dt className="text-xs font-extrabold uppercase tracking-[0.12em] text-foreground/55">{t('anniversary_30.quick_fact_tracker_label')}</dt>
                  <dd className="mt-2 font-extrabold"><Link href="#tracker" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{t('anniversary_30.quick_fact_tracker_value')}</Link></dd>
                </div>
              </dl>
            </section>

            <section id="confirmed" className="mt-14 scroll-mt-28" aria-labelledby="anniversary-facts-title">
              <div className="mx-auto max-w-3xl text-center">
                <p className="page-eyebrow justify-center">{t('anniversary_30.confirmed_title')}</p>
                <h2 id="anniversary-facts-title" className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                  {t('anniversary_30.confirmed_title')}
                </h2>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {facts.map((fact) => (
                  <section key={fact.id} className="section-frame p-6" aria-labelledby={`anniversary-fact-${fact.id}`}>
                    <h3 id={`anniversary-fact-${fact.id}`} className="text-xl font-extrabold tracking-tight">
                      {fact.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-foreground/70">{fact.body}</p>
                  </section>
                ))}
              </div>
            </section>

            <section id="pikachu" className="mx-auto mt-14 max-w-5xl scroll-mt-28" aria-labelledby="anniversary-pikachu-title">
              <div className="max-w-3xl">
                <p className="page-eyebrow">{t('anniversary_30.pikachu_section_title')}</p>
                <h2 id="anniversary-pikachu-title" className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                  {t('anniversary_30.pikachu_section_title')}
                </h2>
                <p className="mt-4 leading-8 text-foreground/70">{t('anniversary_30.pikachu_intro')}</p>
              </div>
              <div className="mt-6 rounded-sm border border-border/70 bg-background/50 p-5 text-sm leading-7 text-foreground/65">
                {t('anniversary_30.pikachu_disclaimer')}
              </div>
            </section>

            <section id="tracker" className="mx-auto mt-10 max-w-5xl scroll-mt-28 section-frame p-6 md:p-8" aria-labelledby="anniversary-tracker-title">
              <p className="page-eyebrow">{t('anniversary_30.tracker_eyebrow')}</p>
              <h2 id="anniversary-tracker-title" className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                {t('anniversary_30.tracker_title')}
              </h2>
              <p className="mt-4 max-w-3xl leading-8 text-foreground/70">{t('anniversary_30.tracker_body')}</p>
              <div className="mt-8">
                <Anniversary30Tracker
                  labels={{
                    progress: t('anniversary_30.tracker_progress'),
                    slot: t('anniversary_30.tracker_slot'),
                    loading: t('anniversary_30.tracker_loading'),
                    reset: t('anniversary_30.tracker_reset'),
                    resetAria: t('anniversary_30.tracker_reset_aria'),
                    localNote: t('anniversary_30.tracker_local_note'),
                  }}
                />
              </div>
            </section>

            <section id="products" className="mt-14 scroll-mt-28" aria-labelledby="anniversary-products-title">
              <div className="mx-auto max-w-3xl text-center">
                <p className="page-eyebrow justify-center">{t('anniversary_30.products_title')}</p>
                <h2 id="anniversary-products-title" className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                  {t('anniversary_30.products_title')}
                </h2>
                <p className="mt-4 leading-7 text-foreground/70">{t('anniversary_30.products_intro')}</p>
              </div>
              <div className="mt-8 space-y-10">
                {productGroups.map((group) => (
                  <section key={group.id} aria-labelledby={`anniversary-products-${group.id}`}>
                    <h3 id={`anniversary-products-${group.id}`} className="text-2xl font-extrabold tracking-tight">
                      {group.label}
                    </h3>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {group.products.map((product) => (
                        <article key={product.id} className="section-frame flex flex-col overflow-hidden">
                          <div className="relative aspect-[16/9] border-b border-border/60 bg-background/50">
                            <Image
                              src={product.imageUrl[language]}
                              alt={t(product.nameKey)}
                              fill
                              sizes="(min-width: 768px) 44vw, 100vw"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex flex-1 flex-col p-6">
                            <h4 className="text-xl font-extrabold tracking-tight">{t(product.nameKey)}</h4>
                            <p className="mt-3 flex-1 text-sm leading-7 text-foreground/70">{t(product.descriptionKey)}</p>
                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs font-bold uppercase tracking-[0.12em] text-foreground/50">
                              <span>{t(product.availabilityKey)}</span>
                              <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                                {t('anniversary_30.source_link_label')}
                              </a>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>

            <section id="faq" className="mx-auto mt-14 max-w-5xl scroll-mt-28 section-frame p-6 md:p-8" aria-labelledby="anniversary-faq-title">
              <h2 id="anniversary-faq-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('anniversary_30.faq_title')}
              </h2>
              <div className="mt-5 divide-y divide-border/60">
                {faqs.map(({ question, answer }) => (
                  <details key={question} className="group py-4 first:pt-0 last:pb-0">
                    <summary className="cursor-pointer list-none pr-6 font-bold marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                      {question}
                    </summary>
                    <p className="mt-3 text-sm leading-7 text-foreground/70">{answer}</p>
                  </details>
                ))}
              </div>
            </section>

            <section id="sources" className="mx-auto mt-14 max-w-5xl scroll-mt-28 border-t border-border/60 pt-8" aria-labelledby="anniversary-sources-title">
              <h2 id="anniversary-sources-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('anniversary_30.sources_title')}
              </h2>
              <p className="mt-4 leading-7 text-foreground/70">
                {t('anniversary_30.sources_body')} <span className="font-bold text-foreground/80">{t('anniversary_30.updated_label')} <time dateTime={ANNIVERSARY_30_LAST_MODIFIED_DATE}>{t('anniversary_30.updated_date')}</time>.</span>
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
                {ANNIVERSARY_30_SOURCES.map((source) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                    {t(source.nameKey)}
                  </a>
                ))}
              </div>
            </section>

            <nav className="mx-auto mt-10 max-w-5xl" aria-label={t('anniversary_30.nav_label')}>
              <div className="flex flex-wrap gap-3">
                <Link href={localeHref('/tcg', language)} className="glass-btn glass-btn-active touch-target px-4 py-3 text-sm font-bold">
                  {t('anniversary_30.cta_tcg')}
                </Link>
                <Link href={localeHref('/guides/pokemon-card-collection-tracker', language)} className="glass-btn touch-target px-4 py-3 text-sm font-bold">
                  {t('anniversary_30.cta_guide')}
                </Link>
              </div>
            </nav>
          </article>
        </main>
      </div>
    </>
  );
}
