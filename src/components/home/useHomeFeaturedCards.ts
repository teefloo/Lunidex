'use client';

import type { TCGCard } from '@/types/tcg';

/**
 * The homepage uses three fixed collector icons instead of a rotating catalog
 * sample. These exact vintage printings are not all represented in TCGdex,
 * so their verified public image assets are kept here and still rendered by
 * the shared TCGCardImage component.
 */
export const HOME_FEATURED_CARDS: TCGCard[] = [
  {
    id: 'miscp_ja-37',
    localId: '37',
    name: 'Pikachu Illustrator',
    image: 'https://images.scrydex.com/pokemon/miscp_ja-37/large',
    category: 'Pokemon',
    source: 'Scrydex',
    set: { id: 'miscp_ja', name: 'Japanese Promos' },
  },
  {
    id: 'wotc-presentation-009-165r',
    localId: '009/165R',
    name: 'Blastoise — Commissioned Presentation Galaxy Star Holo (1998)',
    image: 'https://www.cardtrader.com/uploads/blueprints/image/273508/show_blastoise-cosmos-holo-009-165-white-back-starlight-holo-test-print-card-wizards-of-the-coast-era-promos.jpg',
    category: 'Pokemon',
    source: 'CardTrader',
    set: { id: 'wotc-era-promos', name: "Wizards of the Coast Era Promos" },
  },
  {
    id: 'base1-4',
    localId: '4',
    name: 'Charizard — Base Set 1st Edition Shadowless',
    image: 'https://images.scrydex.com/pokemon/base1-4/large',
    category: 'Pokemon',
    source: 'Scrydex',
    set: { id: 'base1', name: 'Base Set' },
  },
];

export function useHomeFeaturedCards(enabled: boolean) {
  return {
    cards: enabled ? HOME_FEATURED_CARDS : [],
    isError: false,
    isLoading: !enabled,
  };
}
