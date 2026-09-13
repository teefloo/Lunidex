import type { Anniversary30Card, Anniversary30Language } from '@/lib/anniversary-30';

const PROVIDER_CARD_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i;

export type Anniversary30CardItemListInput = {
  pageUrl: string;
  language: Anniversary30Language;
  name: string;
  cards: readonly Anniversary30Card[];
  getCardUrl: (cardId: string) => string;
};

/**
 * Build a crawlable card ItemList without inventing detail URLs for fallback
 * records. The page can still render every record; only provider identities
 * are eligible for structured detail links.
 */
export function buildAnniversary30CardItemList({
  pageUrl,
  language,
  name,
  cards,
  getCardUrl,
}: Anniversary30CardItemListInput) {
  const linkedCards = cards.filter(
    (card) => typeof card.lunidexCardId === 'string' && PROVIDER_CARD_ID_PATTERN.test(card.lunidexCardId),
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${pageUrl}#cards`,
    url: pageUrl,
    name,
    inLanguage: language,
    numberOfItems: linkedCards.length,
    itemListElement: linkedCards.map((card, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: card.name,
        description: card.illustrator ? `${card.rarity ?? ''} — ${card.illustrator}`.trim() : card.rarity,
        url: getCardUrl(card.lunidexCardId!),
        ...(card.imageUrl?.[language] ? { image: card.imageUrl[language] } : {}),
      },
    })),
  } as const;
}
