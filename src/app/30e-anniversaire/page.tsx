import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  Anniversary30CardGrid,
  type Anniversary30CardGridLabels,
} from '@/components/anniversary/Anniversary30CardGrid';
import { Anniversary30Countdown } from '@/components/anniversary/Anniversary30Countdown';
import Anniversary30Tracker from '@/components/anniversary/Anniversary30Tracker';
import Header from '@/components/layout/Header';
import {
  ANNIVERSARY_30_HERO_IMAGE,
  ANNIVERSARY_30_INDEXABLE_LANGUAGES,
  ANNIVERSARY_30_LAST_MODIFIED_DATE,
  ANNIVERSARY_30_PATH,
  ANNIVERSARY_30_PRODUCTS,
  ANNIVERSARY_30_PUBLICATION_DATE,
  ANNIVERSARY_30_RELEASE_DATE,
  ANNIVERSARY_30_SOURCES,
  type Anniversary30Card,
  getAnniversary30Language,
  isAnniversary30Language,
} from '@/lib/anniversary-30';
import { getAnniversary30PageData } from '@/lib/anniversary-30-server';
import { buildAnniversary30CardItemList } from '@/lib/anniversary-30-seo';
import {
  getAnniversary30FeaturedCards,
  getAnniversary30FuturisticRareCards,
} from '@/lib/anniversary-30-cards';
import { encodeTCGCollectionKey } from '@/lib/tcg-collections';
import { serializeJsonLd } from '@/lib/json-ld';
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildInLanguage,
  buildLocalizedLanguages,
  localeHref,
} from '@/lib/seo';
import { getServerLanguage, getServerTForLanguage } from '@/lib/server-i18n';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const revalidate = 3600;

const FACT_KEYS = ['release', 'booster', 'pikachu', 'pikachu_ex', 'foil', 'classic'] as const;
const FAQ_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const PRODUCT_MONTHS = ['2026-09', '2026-10', '2026-11'] as const;
const VALID_PROVIDER_CARD_ID = /^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i;

function getAnniversary30CardLink(
  card: Anniversary30Card,
  language: 'en' | 'fr',
): { href: string; internal: boolean } | null {
  if (card.lunidexCardId && VALID_PROVIDER_CARD_ID.test(card.lunidexCardId)) {
    return {
      href: `${localeHref(`/tcg/cards/${encodeURIComponent(card.lunidexCardId)}`, language)}?tcgLang=${encodeURIComponent(language)}`,
      internal: true,
    };
  }

  return card.officialUrl ? { href: card.officialUrl, internal: false } : null;
}

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

  const pageData = await getAnniversary30PageData(language);
  const collectionKey = encodeTCGCollectionKey(language, pageData.setId);
  if (!collectionKey) {
    throw new Error('Unable to create a valid 30th Celebration collection key.');
  }

  const featuredCards = getAnniversary30FeaturedCards(pageData.cards);
  const futuristicCards = getAnniversary30FuturisticRareCards(pageData.cards);
  const pageUrl = `${SITE_URL}${localizedPath}`;
  const facts = FACT_KEYS.map((key) => ({
    id: key,
    title: t(`anniversary_30.facts.${key}_title`),
    body: t(`anniversary_30.facts.${key}_body`),
  }));
  const faqs = FAQ_NUMBERS.map((number) => ({
    question: t(`anniversary_30.faq_q${number}`),
    answer: t(`anniversary_30.faq_a${number}`),
  }));
  const productGroups = PRODUCT_MONTHS.map((month) => ({
    id: month,
    label: t(`anniversary_30.products.month_${month.slice(5)}`),
    products: ANNIVERSARY_30_PRODUCTS.filter((product) => product.month === month),
  }));
  const cardLabels: Anniversary30CardGridLabels = {
    filterLabel: t('anniversary_30.checklist_filter_label'),
    filterAll: t('anniversary_30.checklist_filter_all'),
    filterOwned: t('anniversary_30.checklist_filter_owned'),
    filterMissing: t('anniversary_30.checklist_filter_missing'),
    filterWishlist: t('anniversary_30.checklist_filter_wishlist'),
    filterPikachu: t('anniversary_30.checklist_filter_pikachu'),
    filterPokemonEx: t('anniversary_30.checklist_filter_pokemon_ex'),
    filterIllustrationRare: t('anniversary_30.checklist_filter_illustration_rare'),
    filterSpecialIllustrationRare: t('anniversary_30.checklist_filter_special_illustration_rare'),
    filterFuturisticRare: t('anniversary_30.checklist_filter_futuristic_rare'),
    filterClassicCollection: t('anniversary_30.checklist_filter_classic'),
    empty: t('anniversary_30.checklist_empty'),
    markOwned: t('anniversary_30.checklist_mark_owned'),
    owned: t('anniversary_30.checklist_owned'),
    viewCard: t('anniversary_30.checklist_view_card'),
    officialSource: t('anniversary_30.checklist_official_source'),
    imageUnavailable: t('anniversary_30.checklist_image_unavailable'),
    imageNotPublished: t('anniversary_30.checklist_image_not_published'),
    illustrator: t('anniversary_30.checklist_illustrator'),
    scopeNumbered: t('anniversary_30.scope_numbered'),
    scopeSecret: t('anniversary_30.scope_secret'),
    scopePikachu: t('anniversary_30.scope_pikachu'),
    scopeClassic: t('anniversary_30.scope_classic'),
    scopeEnergy: t('anniversary_30.scope_energy'),
    scopePromo: t('anniversary_30.scope_promo'),
    statusOfficial: t('anniversary_30.status_official'),
    statusVerified: t('anniversary_30.status_verified'),
    statusReported: t('anniversary_30.status_reported'),
    statusUnknown: t('anniversary_30.status_unknown'),
    syncRequired: t('anniversary_30.sync_required'),
    loading: t('anniversary_30.tracker_loading'),
  };
  const trackerLabels = {
    progress: t('anniversary_30.tracker_progress'),
    loading: t('anniversary_30.tracker_loading'),
    reset: t('anniversary_30.tracker_reset'),
    resetAria: t('anniversary_30.tracker_reset_aria'),
    localNote: t('anniversary_30.tracker_local_note'),
    migrationTitle: t('anniversary_30.migration_title'),
    migrationPendingAuth: t('anniversary_30.migration_pending_auth'),
    migrationPendingIdentity: t('anniversary_30.migration_pending_identity'),
    migrationReady: t('anniversary_30.migration_ready'),
    migrationDone: t('anniversary_30.migration_done'),
    migrationAction: t('anniversary_30.migration_action'),
    migrationRetry: t('anniversary_30.migration_retry'),
    migrationPreserved: t('anniversary_30.migration_preserved'),
  };

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
    numberOfItems: ANNIVERSARY_30_PRODUCTS.length,
    itemListElement: ANNIVERSARY_30_PRODUCTS.map((product, index) => ({
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
  const cardListJsonLd = buildAnniversary30CardItemList({
    pageUrl,
    language,
    name: t('anniversary_30.checklist_title'),
    cards: pageData.cards,
    getCardUrl: (cardId) => `${SITE_URL}${localeHref(`/tcg/cards/${encodeURIComponent(cardId)}`, language)}?tcgLang=${encodeURIComponent(language)}`,
  });
  const providerStatusLabel = pageData.providerStatus === 'complete'
    ? t('anniversary_30.data_status_complete')
    : pageData.providerStatus === 'partial'
      ? t('anniversary_30.data_status_partial')
      : t('anniversary_30.data_status_fallback');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({ '@graph': [articleJsonLd, breadcrumb, faqJsonLd, productListJsonLd, cardListJsonLd] }),
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
                <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
                  <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-sm border border-primary/25 bg-primary/5 px-5 py-3 text-sm font-bold lg:justify-start">
                    <span>{t('anniversary_30.release_label')}</span>
                    <time dateTime={ANNIVERSARY_30_RELEASE_DATE} className="text-primary">{t('anniversary_30.release_date')}</time>
                  </div>
                  <Anniversary30Countdown
                    releaseDate={ANNIVERSARY_30_RELEASE_DATE}
                    labels={{
                      releaseDate: t('anniversary_30.countdown_release_date'),
                      upcoming: t('anniversary_30.countdown_upcoming'),
                      available: t('anniversary_30.countdown_available'),
                    }}
                  />
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
                <li><Link href="#checklist" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{t('anniversary_30.toc_checklist')}</Link></li>
                <li><Link href="#highlights" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{t('anniversary_30.toc_highlights')}</Link></li>
                <li><Link href="#futuristic" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{t('anniversary_30.toc_futuristic')}</Link></li>
                <li><Link href="#classic" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{t('anniversary_30.toc_classic')}</Link></li>
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
                  <dd className="mt-2 font-extrabold text-primary"><time dateTime={ANNIVERSARY_30_RELEASE_DATE}>{t('anniversary_30.release_date')}</time></dd>
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
                  <dt className="text-xs font-extrabold uppercase tracking-[0.12em] text-foreground/55">{t('anniversary_30.quick_fact_checklist_label')}</dt>
                  <dd className="mt-2 font-extrabold">{t('anniversary_30.quick_fact_checklist_value', { count: pageData.cards.length })}</dd>
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
              <div id="tracker" className="mt-8 scroll-mt-28 section-frame p-6 md:p-8" aria-labelledby="anniversary-tracker-title">
                <p className="page-eyebrow">{t('anniversary_30.tracker_eyebrow')}</p>
                <h3 id="anniversary-tracker-title" className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                  {t('anniversary_30.tracker_title')}
                </h3>
                <p className="mt-4 max-w-3xl leading-8 text-foreground/70">{t('anniversary_30.tracker_body')}</p>
                <Anniversary30Tracker
                  cards={pageData.pikachu}
                  collectionKey={collectionKey}
                  language={language}
                  cardLabels={cardLabels}
                  labels={trackerLabels}
                />
              </div>
            </section>

            <section id="checklist" className="mt-14 scroll-mt-28 section-frame p-6 md:p-8" aria-labelledby="anniversary-checklist-title">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="page-eyebrow">{t('anniversary_30.checklist_eyebrow')}</p>
                  <h2 id="anniversary-checklist-title" className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                    {t('anniversary_30.checklist_title')}
                  </h2>
                  <p className="mt-4 leading-8 text-foreground/70">{t('anniversary_30.checklist_body')}</p>
                </div>
                <span className="rounded-sm border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-primary">
                  {providerStatusLabel}
                </span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  [t('anniversary_30.scope_numbered'), pageData.numberedMain.length],
                  [t('anniversary_30.scope_secret'), pageData.secretRares.length],
                  [t('anniversary_30.scope_pikachu'), pageData.pikachu.length],
                  [t('anniversary_30.scope_classic'), pageData.classicCollection.length],
                  [t('anniversary_30.scope_energy'), pageData.basicEnergy.length],
                  [t('anniversary_30.scope_promo'), pageData.promos.length],
                ].map(([label, count]) => (
                  <div key={String(label)} className="rounded-sm border border-border/60 bg-background/45 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/50">{label}</p>
                    <p className="mt-1 text-xl font-black tabular-nums text-primary">{count}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs leading-6 text-foreground/50">
                {t('anniversary_30.data_quality', { count: pageData.unavailableImageCount })}
              </p>
              <Anniversary30CardGrid
                cards={pageData.cards}
                collectionKey={collectionKey}
                language={language}
                labels={cardLabels}
                className="mt-6"
              />
            </section>

            {featuredCards.length > 0 && (
              <section id="highlights" className="mt-14 scroll-mt-28" aria-labelledby="anniversary-highlights-title">
                <div className="max-w-3xl">
                  <p className="page-eyebrow">{t('anniversary_30.highlights_eyebrow')}</p>
                  <h2 id="anniversary-highlights-title" className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                    {t('anniversary_30.highlights_title')}
                  </h2>
                  <p className="mt-4 leading-8 text-foreground/70">{t('anniversary_30.highlights_body')}</p>
                </div>
                <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {featuredCards.map((card) => {
                    const cardLink = getAnniversary30CardLink(card, language);
                    const imageSource = card.imageUrl?.[language] ?? card.imageUrl?.en;
                    return (
                      <article key={card.id} className="section-frame flex min-w-0 flex-col overflow-hidden">
                        <div className="relative aspect-[2.15/3] overflow-hidden bg-background/55">
                          {imageSource ? (
                            <Image
                              src={imageSource}
                              alt={`${card.name} — ${card.collectorNumber}`}
                              fill
                              unoptimized
                              sizes="(min-width: 1024px) 18vw, (min-width: 640px) 42vw, 44vw"
                              className="object-contain p-2"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center p-5 text-center">
                              <span className="text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-foreground/45">
                                {card.imageStatus === 'not-published'
                                  ? t('anniversary_30.checklist_image_not_published')
                                  : t('anniversary_30.checklist_image_unavailable')}
                              </span>
                            </div>
                          )}
                          <span className="absolute left-2 top-2 rounded-sm border border-border/50 bg-background/85 px-1.5 py-1 text-[10px] font-black tabular-nums text-foreground/70">
                            {card.collectorNumber}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-primary">{card.rarity}</p>
                          <h3 className="mt-2 text-lg font-extrabold tracking-tight">{card.name}</h3>
                          {card.illustrator && (
                            <p className="mt-2 text-xs leading-5 text-foreground/55">
                              {t('anniversary_30.checklist_illustrator')}: {card.illustrator}
                            </p>
                          )}
                          {cardLink && (
                            cardLink.internal ? (
                              <Link href={cardLink.href} className="mt-auto inline-flex min-h-11 items-center pt-4 text-xs font-black uppercase tracking-[0.08em] text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">
                                {t('anniversary_30.checklist_view_card')}
                              </Link>
                            ) : (
                              <a href={cardLink.href} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex min-h-11 items-center pt-4 text-xs font-black uppercase tracking-[0.08em] text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">
                                {t('anniversary_30.checklist_official_source')}
                              </a>
                            )
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {futuristicCards.length > 0 && (
              <section id="futuristic" className="mt-14 scroll-mt-28 section-frame p-6 md:p-8" aria-labelledby="anniversary-futuristic-title">
                <div className="max-w-3xl">
                  <p className="page-eyebrow">{t('anniversary_30.futuristic_eyebrow')}</p>
                  <h2 id="anniversary-futuristic-title" className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                    {t('anniversary_30.futuristic_title')}
                  </h2>
                  <p className="mt-4 leading-8 text-foreground/70">{t('anniversary_30.futuristic_body')}</p>
                </div>
                <Anniversary30CardGrid
                  cards={futuristicCards}
                  collectionKey={collectionKey}
                  language={language}
                  labels={cardLabels}
                  filters={['all']}
                  className="mt-7"
                />
              </section>
            )}

            <section id="classic" className="mt-14 scroll-mt-28" aria-labelledby="anniversary-classic-title">
              <div className="max-w-3xl">
                <p className="page-eyebrow">{t('anniversary_30.classic_eyebrow')}</p>
                <h2 id="anniversary-classic-title" className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                  {t('anniversary_30.classic_title')}
                </h2>
                <p className="mt-4 leading-8 text-foreground/70">{t('anniversary_30.classic_body')}</p>
              </div>
              <ol className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {pageData.classicCollection.map((card, index) => (
                  <li key={card.id} className="rounded-sm border border-border/60 bg-card/25 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-primary">{String(index + 1).padStart(2, '0')} · {card.name}</p>
                    <p className="mt-2 text-xs leading-5 text-foreground/55">{card.originalNumber} — {card.originalSet}</p>
                  </li>
                ))}
              </ol>
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
                            <p className="mt-3 text-xs font-bold uppercase leading-5 tracking-[0.08em] text-foreground/50">{t(product.contentKey)}</p>
                            <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4 text-xs font-bold uppercase tracking-[0.1em] text-foreground/50">
                              <span className="rounded-sm border border-primary/20 bg-primary/5 px-2 py-1 text-primary">
                                {product.boosterCount === null
                                  ? t('anniversary_30.products.no_boosters')
                                  : t('anniversary_30.products.boosters', { count: product.boosterCount })}
                              </span>
                              {product.classicBoosterCount && (
                                <span className="rounded-sm border border-amber-400/25 bg-amber-400/5 px-2 py-1 text-amber-300">
                                  {t('anniversary_30.products.classic_boosters', { count: product.classicBoosterCount })}
                                </span>
                              )}
                              {product.variantKey && <span className="rounded-sm border border-border/50 px-2 py-1">{t(product.variantKey)}</span>}
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.12em] text-foreground/50">
                              <span>{t('anniversary_30.products.source_confirmed')}</span>
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

            <section id="sources" className="mx-auto mt-14 max-w-5xl scroll-mt-28 section-frame p-6 md:p-8" aria-labelledby="anniversary-sources-title">
              <h2 id="anniversary-sources-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('anniversary_30.sources_title')}
              </h2>
              <p className="mt-4 max-w-4xl leading-8 text-foreground/70">
                {t('anniversary_30.sources_body')} <span className="font-bold text-foreground/80">{t('anniversary_30.updated_label')} <time dateTime={ANNIVERSARY_30_LAST_MODIFIED_DATE}>{t('anniversary_30.updated_date')}</time>.</span>
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {ANNIVERSARY_30_SOURCES.map((source) => (
                  <li key={source.id}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between gap-3 rounded-sm border border-border/60 bg-card/25 px-4 py-3 text-sm font-bold text-primary underline decoration-primary/30 underline-offset-4 hover:border-primary/40 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">
                      <span>{t(source.nameKey)}</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <nav className="mx-auto mt-10 flex max-w-5xl flex-wrap items-center justify-center gap-3 border-t border-border/60 pt-8" aria-label={t('anniversary_30.nav_label')}>
              <Link href={localeHref('/tcg', language)} className="glass-btn glass-btn-active touch-target px-5 py-3 text-sm font-bold">
                {t('anniversary_30.cta_tcg')}
              </Link>
              <Link href={localeHref('/guides/pokemon-card-collection-tracker', language)} className="glass-btn touch-target px-5 py-3 text-sm font-bold">
                {t('anniversary_30.cta_guide')}
              </Link>
              <Link href={localeHref('/about', language)} className="glass-btn touch-target px-5 py-3 text-sm font-bold">
                {t('anniversary_30.cta_about')}
              </Link>
            </nav>
          </article>
        </main>
      </div>
    </>
  );
}
