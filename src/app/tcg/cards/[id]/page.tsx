import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getTCGCardCached } from '@/lib/api/server-cache';
import { SITE_URL } from '@/lib/site';
import { TCGCardDetailRoute } from '@/components/tcg/TCGCardDetailRoute';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { supportedLanguages } from '@/lib/languages';
import { serializeJsonLd } from '@/lib/json-ld';
import { normalizeTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';
import { getTCGCardMetaDescriptionKey, PUBLIC_TCG_CARD_ROBOTS } from '@/lib/tcg-seo';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tcgLang?: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const currentLang = await getServerLanguage();
  const query = await searchParams;
  const requestedTcgLanguage = Array.isArray(query.tcgLang) ? query.tcgLang[0] : query.tcgLang;
  const tcgLanguage = normalizeTCGCardLanguage(requestedTcgLanguage, 'en') as TCGCardLanguage;
  const canonicalLanguage = currentLang;
  const t = await getServerT();
  const card = await getPageCard(id, tcgLanguage);

  if (!card) {
    notFound();
  }

  const setName = card.set?.name ?? '';
  const rarity = card.rarity ?? '';
  const title = t('tcg.card_meta_title', {
    name: card.name,
    set: setName || t('tcg.unknown', { defaultValue: 'TCG' }),
  });
  const description = t(
    getTCGCardMetaDescriptionKey(rarity),
    {
      name: card.name,
      rarity,
      set: setName || t('tcg.unknown', { defaultValue: 'TCG' }),
      hp: card.hp ?? '?',
    },
  );
  // Dynamic Soft Pixel OG image (card art + name + rarity), localized via ?lang=.
  const encodedCardId = encodeURIComponent(id);
  const ogImage = `${SITE_URL}/api/og/tcg-card?id=${encodedCardId}&lang=${tcgLanguage}`;
  const indexableLanguages = supportedLanguages;
  const languages = Object.fromEntries(
    indexableLanguages.map((language) => [language, `/${language}/tcg/cards/${encodedCardId}`]),
  );

  return {
    // Bundled titles already carry the "| Lunidex" suffix; absolute prevents
    // the root layout template from appending a second one.
    title: { absolute: title },
    description,
    robots: PUBLIC_TCG_CARD_ROBOTS,
    alternates: {
      canonical: `/${canonicalLanguage}/tcg/cards/${encodedCardId}`,
      languages: { ...languages, 'x-default': `/en/tcg/cards/${encodedCardId}` },
    },
    openGraph: {
      title,
      description,
      url: `/${canonicalLanguage}/tcg/cards/${encodedCardId}`,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: card.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function TCGCardPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const currentLang = await getServerLanguage();
  const query = await searchParams;
  const requestedTcgLanguage = Array.isArray(query.tcgLang) ? query.tcgLang[0] : query.tcgLang;
  const tcgLanguage = normalizeTCGCardLanguage(requestedTcgLanguage, 'en') as TCGCardLanguage;
  const canonicalLanguage = currentLang;
  const t = await getServerT();
  const card = await getPageCard(id, tcgLanguage);
  if (!card) notFound();

  const setName = card.set?.name ?? '';
  const setId = card.set?.id ?? '';
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('common.home', { defaultValue: 'Lunidex' }), item: `${SITE_URL}/${currentLang}` },
      { '@type': 'ListItem', position: 2, name: t('tcg.page_heading', { defaultValue: 'TCG Catalog' }), item: `${SITE_URL}/${currentLang}/tcg` },
      ...(setId ? [{ '@type': 'ListItem', position: 3, name: setName, item: `${SITE_URL}/${canonicalLanguage}/tcg/sets/${encodeURIComponent(setId)}` }] : []),
      { '@type': 'ListItem', position: setId ? 4 : 3, name: card.name, item: `${SITE_URL}/${canonicalLanguage}/tcg/cards/${encodeURIComponent(card.id)}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <Breadcrumbs
        items={[
          { label: t('common.home', { defaultValue: 'Home' }), href: `/${currentLang}` },
          { label: t('tcg.page_heading', { defaultValue: 'TCG Catalog' }), href: `/${currentLang}/tcg` },
          ...(setId ? [{ label: setName, href: `/${currentLang}/tcg/sets/${setId}` }] : []),
          { label: card.name },
        ]}
        homeLabel={t('common.home', { defaultValue: 'Home' })}
      />
      <TCGCardDetailRoute card={card} tcgLanguage={tcgLanguage} />
    </>
  );
}

const getPageCard = cache(getTCGCardCached);
