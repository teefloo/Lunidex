import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTCGCard } from '@/lib/api/tcg';
import { SITE_URL } from '@/lib/site';
import { TCGCardDetailRoute } from '@/components/tcg/TCGCardDetailRoute';
import { getServerLanguage } from '@/lib/server-i18n';
import { buildSubpathLanguages } from '@/lib/seo';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { lang } = await searchParams;
  const card = await getTCGCard(id, lang ?? 'en');
  const currentLang = await getServerLanguage();
  const fallbackTitle = 'TCG Card | PrimeDex';
  const fallbackDesc = 'Pokemon TCG card details.';

  if (!card) {
    return {
      title: fallbackTitle,
      description: fallbackDesc,
      alternates: {
        canonical: `/${currentLang}/tcg/cards/${id}`,
        languages: buildSubpathLanguages(`/tcg/cards/${id}`),
      },
    };
  }

  const setName = card.set?.name ?? '';
  const rarity = card.rarity ?? '';
  const typeInfo = card.types?.join('/') ?? card.category ?? '';
  const setLabel = setName ? ` from ${setName}` : '';
  const rarityLabel = rarity ? ` (${rarity})` : '';
  const typeLabel = typeInfo ? ` [${typeInfo}]` : '';
  const title = `${card.name} - ${setName || 'TCG'} | PrimeDex`;
  const description = `${card.name}${typeLabel}${rarityLabel}${setLabel}. HP ${card.hp ?? '?'}. Card details, attacks, abilities, and pricing on PrimeDex.`;
  // Dynamic Soft Pixel OG image (card art + name + rarity), localized via ?lang=.
  const ogImage = `${SITE_URL}/api/og/tcg-card?id=${encodeURIComponent(id)}&lang=${lang ?? currentLang}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${currentLang}/tcg/cards/${id}`,
      languages: buildSubpathLanguages(`/tcg/cards/${id}`),
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

export default async function TCGCardPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { lang } = await searchParams;
  const card = await getTCGCard(id, lang ?? 'en');
  if (!card) notFound();

  const currentLang = await getServerLanguage();

  const imageUrl = card.imageUrl || card.image || `${SITE_URL}/images/card-placeholder.svg`;
  const setName = card.set?.name ?? '';
  const setId = card.set?.id ?? '';
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: card.name,
    sku: card.id,
    mpn: card.localId,
    identifier: card.id,
    image: imageUrl,
    description: `${card.name} Pokémon TCG card${setName ? ` from ${setName}` : ''}${card.rarity ? ` (${card.rarity})` : ''}.`,
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
      { '@type': 'ListItem', position: 1, name: 'PrimeDex', item: `${SITE_URL}/${currentLang}` },
      { '@type': 'ListItem', position: 2, name: 'TCG Catalog', item: `${SITE_URL}/${currentLang}/tcg` },
      ...(setId ? [{ '@type': 'ListItem', position: 3, name: setName, item: `${SITE_URL}/${currentLang}/tcg/collection/${setId}` }] : []),
      { '@type': 'ListItem', position: setId ? 4 : 3, name: card.name, item: `${SITE_URL}/${currentLang}/tcg/cards/${card.id}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <TCGCardDetailRoute card={card} />
    </>
  );
}
