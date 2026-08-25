import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Header from '@/components/layout/Header';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ShareButton } from '@/components/share/ShareButton';
import { TCGImageWithFallback } from '@/components/tcg/TCGImageWithFallback';
import { getTCGSetCached, getTCGSetCardsCached } from '@/lib/api/server-cache';
import { isTcgLangSupported } from '@/lib/api/tcg';
import { buildInLanguage, localeHref } from '@/lib/seo';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { supportedLanguages, type SupportedLanguage } from '@/lib/languages';
import { getTCGCardImageCandidates, getTCGSetImageCandidates } from '@/lib/tcg-images';
import { getTCGSetCardCount, isIndexableTCGSetCardList } from '@/lib/tcg-seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ setId: string }>;
}

function buildSetLanguages(setId: string): Record<string, string> {
  const languages = supportedLanguages
    .filter(isTcgLangSupported)
    .reduce<Record<string, string>>((result, language) => {
      result[language] = `/${language}/tcg/sets/${encodeURIComponent(setId)}`;
      return result;
    }, {});

  return { ...languages, 'x-default': `/en/tcg/sets/${encodeURIComponent(setId)}` };
}

function formatReleaseDate(value: string | undefined, language: SupportedLanguage): string {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(value));
}

async function getSetPageData(setId: string, language: SupportedLanguage) {
  const set = await getTCGSetCached(setId, language).catch(() => null);
  if (!set) return null;

  const cards = await getTCGSetCardsCached(setId, language).catch(() => []);
  return { set, cards, isIndexable: isIndexableTCGSetCardList(set, cards) };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { setId } = await params;
  const language = await getServerLanguage();
  const t = await getServerT();
  const data = await getSetPageData(setId, language);

  if (!data) notFound();

  const releaseDate = formatReleaseDate(data.set.releaseDate, language);
  const title = t('tcg.set_meta_title', { name: data.set.name, releaseDate });
  const description = t('tcg.set_meta_description', { name: data.set.name, releaseDate });
  const canonicalLanguage = isTcgLangSupported(language) ? language : 'en';
  const ogImage = `${SITE_URL}/api/og/tcg-set?set=${encodeURIComponent(setId)}&lang=${canonicalLanguage}`;

  return {
    title: { absolute: title },
    description,
    robots: data.isIndexable && isTcgLangSupported(language)
      ? { index: true, follow: true }
      : { index: false, follow: true },
    alternates: {
      canonical: `/${canonicalLanguage}/tcg/sets/${encodeURIComponent(setId)}`,
      languages: buildSetLanguages(setId),
    },
    openGraph: {
      title,
      description,
      url: `/${canonicalLanguage}/tcg/sets/${encodeURIComponent(setId)}`,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: data.set.name }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  };
}

export default async function TCGSetPage({ params }: PageProps) {
  const { setId } = await params;
  const language = await getServerLanguage();
  const t = await getServerT();
  const data = await getSetPageData(setId, language);

  if (!data) notFound();

  const { set, cards, isIndexable } = data;
  const releaseDate = formatReleaseDate(set.releaseDate, language);
  const total = cards.length > 0 ? cards.length : getTCGSetCardCount(set);
  const path = `/tcg/sets/${encodeURIComponent(setId)}`;
  const pageTitle = t('tcg.set_meta_title', { name: set.name, releaseDate });
  const pageDescription = t('tcg.set_meta_description', { name: set.name, releaseDate });
  const setUrl = `${SITE_URL}${localeHref(path, language)}`;
  const setImage = getTCGSetImageCandidates(set);
  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${setUrl}#collection`,
    name: pageTitle,
    description: pageDescription,
    url: setUrl,
    inLanguage: buildInLanguage(language),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@type': 'Thing', name: 'Pokémon Trading Card Game' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: cards.length,
      itemListElement: cards.map((card, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: card.name,
        url: `${SITE_URL}${localeHref(`/tcg/cards/${encodeURIComponent(card.id)}`, language)}`,
      })),
    },
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('common.home', { defaultValue: 'Home' }), item: `${SITE_URL}/${language}` },
      { '@type': 'ListItem', position: 2, name: t('tcg.page_heading', { defaultValue: 'TCG Catalog' }), item: `${SITE_URL}/${language}/tcg` },
      { '@type': 'ListItem', position: 3, name: set.name, item: setUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <div className="app-page">
        <Header />
        <Breadcrumbs
          items={[
            { label: t('common.home', { defaultValue: 'Home' }), href: `/${language}` },
            { label: t('tcg.page_heading', { defaultValue: 'TCG Catalog' }), href: `/${language}/tcg` },
            { label: set.name },
          ]}
          homeLabel={t('common.home', { defaultValue: 'Home' })}
        />
        <main className="page-shell pb-24" aria-labelledby="tcg-set-title">
          <section className="page-surface mt-6 grid gap-7 px-5 py-7 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:py-9">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                {t('tcg.set_landing_checklist', { defaultValue: 'Pokémon TCG set checklist' })}
              </p>
              <h1 id="tcg-set-title" className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                {set.name} — {t('tcg.set_landing_checklist', { defaultValue: 'Card list and checklist' })}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-foreground/65">{pageDescription}</p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-foreground/55">
                <span>{t('tcg.activation.card_total', { count: total })}</span>
                <span>{releaseDate}</span>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={localeHref(`/tcg/collection/${encodeURIComponent(set.id)}?activation=1`, language)}
                  className="inline-flex min-h-12 items-center rounded-sm bg-primary px-5 text-sm font-black text-primary-foreground shadow-[4px_4px_0_hsl(var(--foreground)/0.18)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  {t('tcg.activation.choose_set')}
                </Link>
                <ShareButton
                  url={localeHref(path, language)}
                  title={pageTitle}
                  description={pageDescription}
                  label={t('share_menu.label', { defaultValue: 'Share' })}
                />
              </div>
            </div>
            {setImage.length > 0 ? (
              <div className="flex min-h-40 items-center justify-center rounded-sm border border-border/40 bg-muted/25 p-5 md:min-h-52 md:min-w-52">
                <TCGImageWithFallback candidates={setImage} alt={`${set.name} logo`} width={220} height={180} sizes="220px" className="max-h-44 w-auto object-contain" />
              </div>
            ) : null}
          </section>

          <section className="mt-10" aria-labelledby="tcg-set-checklist-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{t('tcg.page_eyebrow', { defaultValue: 'Catalog' })}</p>
                <h2 id="tcg-set-checklist-title" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  {t('tcg.set_landing_checklist', { defaultValue: 'Card checklist' })}
                </h2>
              </div>
              <span className="text-sm font-semibold text-foreground/55">{t('tcg.activation.card_total', { count: total })}</span>
            </div>

            {cards.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {cards.map((card) => (
                  <Link
                    key={card.id}
                    href={localeHref(`/tcg/cards/${encodeURIComponent(card.id)}`, language)}
                    aria-label={t('tcg.open_card_detail', { name: card.name })}
                    className="group rounded-sm border border-border/35 bg-card/45 p-2 transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <TCGImageWithFallback
                      candidates={getTCGCardImageCandidates(card)}
                      alt={card.name}
                      width={240}
                      height={336}
                      sizes="(min-width: 1024px) 15vw, (min-width: 640px) 28vw, 45vw"
                      className="aspect-[5/7] w-full rounded-sm object-contain"
                    />
                    <span className="mt-2 block truncate px-1 pb-1 text-xs font-bold text-foreground/70 group-hover:text-primary">{card.name}</span>
                    <span className="flex items-center justify-between gap-2 px-1 pb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-foreground/45">
                      <span>{card.localId || card.number || card.id}</span>
                      {card.rarity ? <span className="truncate text-right">{card.rarity}</span> : null}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-sm border border-dashed border-border/40 p-8 text-center text-sm text-foreground/60">{t('tcg.no_cards', { defaultValue: 'No cards found' })}</p>
            )}
            {!isIndexable ? (
              <p className="mt-5 rounded-sm border border-dashed border-border/40 p-4 text-center text-sm text-foreground/60">
                {t('tcg.set_landing_unavailable', { defaultValue: 'The complete card list is temporarily unavailable.' })}
              </p>
            ) : null}
          </section>

          <section className="mt-10 rounded-sm border border-primary/20 bg-primary/5 p-5 sm:p-7" aria-labelledby="tcg-set-tracker-title">
            <h2 id="tcg-set-tracker-title" className="text-2xl font-black tracking-tight sm:text-3xl">
              {t('tcg.activation.start_title')}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/65">
              {t('tcg.activation.start_description')}
            </p>
            <Link
              href={localeHref(`/tcg/collection/${encodeURIComponent(set.id)}?activation=1`, language)}
              className="mt-5 inline-flex min-h-12 items-center rounded-sm bg-primary px-5 text-sm font-black text-primary-foreground shadow-[4px_4px_0_hsl(var(--foreground)/0.18)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {t('tcg.activation.choose_set')}
            </Link>
          </section>
        </main>
      </div>
    </>
  );
}
