import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({ get: mockGet })),
  },
}));

vi.mock('axios-retry', () => ({
  default: vi.fn(),
}));

import { getPokemonCards, matchesTcgRarityFilter, mergeTcgCardPages } from './tcg';
import type { TCGCard } from '../types/tcg';

function makeCard(id: string): TCGCard {
  return {
    id,
    localId: id,
    name: 'Pikachu',
    image: `https://assets.example.test/${id}`,
    category: 'Pokemon',
    rarity: 'Promo',
    stage: 'Basic',
    types: ['Lightning'],
  };
}

describe('TCG card pagination', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('merges pages without losing cards or duplicating overlapping results', () => {
    const firstPage = [makeCard('promo-001'), makeCard('promo-002')];
    const secondPage = [makeCard('promo-002'), makeCard('promo-003')];

    expect(mergeTcgCardPages([firstPage, secondPage]).map((card) => card.id)).toEqual([
      'promo-001',
      'promo-002',
      'promo-003',
    ]);
  });

  it('loads Pokémon cards from every remote page', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => makeCard(`promo-${index + 1}`));
    const secondPage = [makeCard('promo-101'), makeCard('promo-102')];

    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('/cards?')) {
        const page = new URL(`https://api.example.test${url}`).searchParams.get('pagination:page');
        return { data: page === '2' ? secondPage : firstPage };
      }

      const id = url.split('/').pop() ?? 'unknown';
      return { data: makeCard(id) };
    });

    const cards = await getPokemonCards('Pikachu');
    const searchCalls = mockGet.mock.calls.filter(([url]) => String(url).includes('/cards?'));

    expect(searchCalls).toHaveLength(2);
    expect(cards).toHaveLength(102);
    expect(cards.at(-1)?.id).toBe('promo-102');
  });
});

describe('TCG promo rarity', () => {
  it('matches both the explicit Promo rarity and the promo variant', () => {
    expect(matchesTcgRarityFilter(makeCard('promo-001'), 'Promo')).toBe(true);
    expect(matchesTcgRarityFilter({ ...makeCard('promo-002'), rarity: 'Rare', variants: { firstEdition: false, holo: false, normal: true, reverse: false, wPromo: true } }, 'Promo')).toBe(true);
    expect(matchesTcgRarityFilter({ ...makeCard('rare-001'), rarity: 'Rare', variants: { firstEdition: false, holo: false, normal: true, reverse: false, wPromo: false } }, 'Promo')).toBe(false);
  });
});
