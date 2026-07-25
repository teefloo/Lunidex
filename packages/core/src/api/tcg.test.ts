import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());
const mockGetCachedData = vi.hoisted(() => vi.fn());
const mockSetCachedData = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({ get: mockGet })),
  },
}));

vi.mock('axios-retry', () => ({
  default: vi.fn(),
}));

vi.mock('./cache', () => ({
  getCachedData: mockGetCachedData,
  setCachedData: mockSetCachedData,
}));

import {
  getAllSets,
  getFilterOptions,
  getPokemonCards,
  matchesTcgRarityFilter,
  mergeTcgCardPages,
} from './tcg';
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

function makeRawSet(id: string, name: string) {
  return {
    id,
    name,
    serie: { id: 'sv', name: 'Scarlet & Violet' },
    cardCount: { total: 10 },
    releaseDate: '2025-01-01',
  };
}

function makeCachedSet(id: string, name: string) {
  return {
    ...makeRawSet(id, name),
    totalCards: 10,
  };
}

describe('TCG card pagination', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGetCachedData.mockReset();
    mockGetCachedData.mockResolvedValue(null);
    mockSetCachedData.mockReset();
    mockSetCachedData.mockResolvedValue(undefined);
  });

  it('refreshes the set list even when IndexedDB contains an older list', async () => {
    const latestSet = makeRawSet('latest-set', 'Latest Set');
    mockGetCachedData.mockImplementation(async (key: string) => (
      key.includes('tcg-all-sets-v7') ? [makeCachedSet('old-set', 'Old Set')] : null
    ));
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/en/sets' || url === '/en/sets/latest-set') {
        return { data: url === '/en/sets' ? [latestSet] : latestSet };
      }

      throw new Error(`Unexpected TCG API request: ${url}`);
    });

    const sets = await getAllSets('en');

    expect(sets.map((set) => set.id)).toEqual(['latest-set']);
    expect(mockGet).toHaveBeenCalledWith('/en/sets');
  });

  it('refreshes filter options instead of returning cached set options', async () => {
    const latestSet = makeRawSet('latest-set', 'Latest Set');
    mockGetCachedData.mockImplementation(async (key: string) => {
      if (key.includes('tcg-filter-options-v7')) {
        return { sets: [makeCachedSet('old-set', 'Old Set')] };
      }
      if (key.includes('tcg-all-sets-v7')) {
        return [makeCachedSet('old-set', 'Old Set')];
      }
      return null;
    });
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/en/sets' || url === '/en/sets/latest-set') {
        return { data: url === '/en/sets' ? [latestSet] : latestSet };
      }

      throw new Error(`Unexpected TCG API request: ${url}`);
    });

    const options = await getFilterOptions('en');

    expect(options.sets?.map((set) => set.id)).toEqual(['latest-set']);
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

  it('builds an asset URL when a card detail has no image field', async () => {
    const missingImageCard = {
      ...makeCard('2024sv-1'),
      image: undefined,
      localId: '1',
      set: { id: '2024sv', name: "McDonald's Collection 2024" },
    };

    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('/cards?')) return { data: [missingImageCard] };
      if (url.includes('/cards/2024sv-1')) return { data: missingImageCard };
      if (url.includes('/sets/2024sv')) {
        return {
          data: {
            id: '2024sv',
            name: "McDonald's Collection 2024",
            serie: { id: 'mc', name: "McDonald's Collection" },
            cardCount: { total: 15 },
          },
        };
      }

      return { data: null };
    });

    const cards = await getPokemonCards('Pikachu');

    expect(cards[0]?.imageUrl).toBe('https://assets.tcgdex.net/en/mc/2024sv/1');
  });
});

describe('TCG promo rarity', () => {
  it('matches both the explicit Promo rarity and the promo variant', () => {
    expect(matchesTcgRarityFilter(makeCard('promo-001'), 'Promo')).toBe(true);
    expect(matchesTcgRarityFilter({ ...makeCard('promo-002'), rarity: 'Rare', variants: { firstEdition: false, holo: false, normal: true, reverse: false, wPromo: true } }, 'Promo')).toBe(true);
    expect(matchesTcgRarityFilter({ ...makeCard('rare-001'), rarity: 'Rare', variants: { firstEdition: false, holo: false, normal: true, reverse: false, wPromo: false } }, 'Promo')).toBe(false);
  });
});
