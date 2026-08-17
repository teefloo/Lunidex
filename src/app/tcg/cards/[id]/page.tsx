import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getTCGCard, isTcgLangSupported } from '@/lib/api/tcg';
import { SITE_URL } from '@/lib/site';
import { TCGCardDetailRoute } from '@/components/tcg/TCGCardDetailRoute';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildInLanguage } from '@/lib/seo';
import { supportedLanguages } from '@/lib/languages';
import { serializeJsonLd } from '@/lib/json-ld';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const currentLang = await getServerLanguage();
  const t = await getServerT();
  const card = await getPageCard(id, currentLang);

  if (!card) {
    notFound();
  }

  const setName = card.set?.name ?? '';
  const rarity = card.rarity ?? '';
  const rarityLabel = isMeaningfulCardValue(rarity)
    ? rarity
    : t('tcg.unknown', { defaultValue: 'Unknown' });
  const title = t('tcg.card_meta_title', {
    name: card.name,
    set: setName || t('tcg.unknown', { defaultValue: 'TCG' }),
  });
  const description = t('tcg.card_meta_description', {
    name: card.name,
    rarity: rarityLabel,
    set: setName || t('tcg.unknown', { defaultValue: 'TCG' }),
    hp: card.hp ?? '?',
  });
  // Dynamic Soft Pixel OG image (card art + name + rarity), localized via ?lang=.
  const ogImage = `${SITE_URL}/api/og/tcg-card?id=${encodeURIComponent(id)}&lang=${currentLang}`;
  const indexableLanguages = supportedLanguages.filter(isTcgLangSupported);
  const canonicalLanguage = isTcgLangSupported(currentLang) ? currentLang : 'en';
  const languages = Object.fromEntries(
    indexableLanguages.map((language) => [language, `/${language}/tcg/cards/${id}`]),
  );

  return {
    title,
    description,
    robots: isTcgLangSupported(currentLang)
      ? { index: true, follow: true }
      : { index: false, follow: true },
    alternates: {
      canonical: `/${canonicalLanguage}/tcg/cards/${id}`,
      languages: { ...languages, 'x-default': `/en/tcg/cards/${id}` },
    },
    openGraph: {
      title,
      description,
      url: `/${currentLang}/tcg/cards/${id}`,
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

export default async function TCGCardPage({ params }: PageProps) {
  const { id } = await params;
  const currentLang = await getServerLanguage();
  const t = await getServerT();
  const card = await getPageCard(id, currentLang);
  if (!card) notFound();

  const imageUrl = card.imageUrl || card.image || `${SITE_URL}/images/card-placeholder.svg`;
  const setName = card.set?.name ?? '';
  const setId = card.set?.id ?? '';
  const rarityLabel = isMeaningfulCardValue(card.rarity)
    ? card.rarity
    : t('tcg.unknown', { defaultValue: 'Unknown' });
  const productDescription = t('tcg.card_meta_description', {
    name: card.name,
    rarity: rarityLabel,
    set: setName || t('tcg.unknown', { defaultValue: 'TCG' }),
    hp: card.hp ?? '?',
  });
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    inLanguage: buildInLanguage(currentLang),
    name: card.name,
    sku: card.id,
    mpn: card.localId,
    identifier: card.id,
    image: imageUrl,
    description: productDescription,
    brand: { '@type': 'Brand', name: 'Pokémon' },
    manufacturer: { '@type': 'Organization', name: 'The Pokémon Company' },
    category: 'Trading Card',
    url: `${SITE_URL}/${currentLang}/tcg/cards/${card.id}`,
    additionalProperty: [
      ...(card.hp ? [{ '@type': 'PropertyValue', name: 'HP', value: card.hp }] : []),
      ...(card.rarity ? [{ '@type': 'PropertyValue', name: 'Rarity', value: card.rarity }] : []),
      ...(card.category ? [{ '@type': 'PropertyValue', name: 'Category', value: card.category }] : []),
      ...(card.stage ? [{ '@type': 'PropertyValue', name: 'Stage', value: card.stage }] : []),
      ...(card.illustrator ? [{ '@type': 'PropertyValue', name: 'Illustrator', value: card.illustrator }] : []),
      ...(card.set?.releaseDate ? [{ '@type': 'PropertyValue', name: 'Release Date', value: card.set.releaseDate }] : []),
    ],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('common.home', { defaultValue: 'Lunidex' }), item: `${SITE_URL}/${currentLang}` },
      { '@type': 'ListItem', position: 2, name: t('tcg.page_heading', { defaultValue: 'TCG Catalog' }), item: `${SITE_URL}/${currentLang}/tcg` },
      ...(setId ? [{ '@type': 'ListItem', position: 3, name: setName, item: `${SITE_URL}/${currentLang}/tcg/collection/${setId}` }] : []),
      { '@type': 'ListItem', position: setId ? 4 : 3, name: card.name, item: `${SITE_URL}/${currentLang}/tcg/cards/${card.id}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <Breadcrumbs
        items={[
          { label: t('common.home', { defaultValue: 'Home' }), href: `/${currentLang}` },
          { label: t('tcg.page_heading', { defaultValue: 'TCG Catalog' }), href: `/${currentLang}/tcg` },
          ...(setId ? [{ label: setName, href: `/${currentLang}/tcg/collection/${setId}` }] : []),
          { label: card.name },
        ]}
        homeLabel={t('common.home', { defaultValue: 'Home' })}
      />
      <TCGCardDetailRoute card={card} />
    </>
  );
}

function isMeaningfulCardValue(value: string | undefined): value is string {
  return Boolean(value && !['none', 'n/a', 'unknown'].includes(value.trim().toLowerCase()));
}

const getPageCard = cache((cardId: string, lang: string) => getTCGCard(cardId, lang));
