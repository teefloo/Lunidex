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
  fetchCollectionValue,
  getAllSets,
  getFilterOptions,
  getPokemonCards,
  searchCards,
  sortCardsByReleaseDate,
} from './tcg';
import type { TCGCard } from '@/types/tcg';

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

function mockLatestSetResponse() {
  const latestSet = makeRawSet('latest-set', 'Latest Set');

  mockGet.mockImplementation(async (url: string) => {
    if (url === '/en/sets' || url === '/en/sets/latest-set') {
      return { data: url === '/en/sets' ? [latestSet] : latestSet };
    }

    throw new Error(`Unexpected TCG API request: ${url}`);
  });
}

describe('TCG set freshness', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGetCachedData.mockReset();
    mockGetCachedData.mockResolvedValue(null);
    mockSetCachedData.mockReset();
    mockSetCachedData.mockResolvedValue(undefined);
  });

  it('refreshes the set list even when IndexedDB contains an older list', async () => {
    mockGetCachedData.mockImplementation(async (key: string) => (
      key.includes('tcg-all-sets-v7') ? [makeCachedSet('old-set', 'Old Set')] : null
    ));
    mockLatestSetResponse();

    const sets = await getAllSets('en');

    expect(sets.map((set) => set.id)).toEqual(['latest-set']);
    expect(mockGet).toHaveBeenCalledWith('/en/sets');
  });

  it('refreshes filter options instead of returning cached set options', async () => {
    mockGetCachedData.mockImplementation(async (key: string) => {
      if (key.includes('tcg-filter-options-v7')) {
        return { sets: [makeCachedSet('old-set', 'Old Set')] };
      }
      if (key.includes('tcg-all-sets-v7')) {
        return [makeCachedSet('old-set', 'Old Set')];
      }
      return null;
    });
    mockLatestSetResponse();

    const options = await getFilterOptions('en');

    expect((options.sets ?? []).map((set) => set.id)).toEqual(['latest-set']);
  });

  it('localizes set logos without corrupting universal symbols', async () => {
    const localizedSet = {
      ...makeRawSet('me1', 'Nuit Noire'),
      logo: 'https://assets.tcgdex.net/en/me/me1/logo',
      symbol: 'https://assets.tcgdex.net/univ/me/me1/symbol',
    };
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/fr/sets' || url === '/fr/sets/me1') {
        return { data: url === '/fr/sets' ? [localizedSet] : localizedSet };
      }
      throw new Error(`Unexpected TCG API request: ${url}`);
    });

    const [set] = await getAllSets('fr');

    expect(set.logo).toBe('https://assets.tcgdex.net/fr/me/me1/logo.png');
    expect(set.symbol).toBe('https://assets.tcgdex.net/univ/me/me1/symbol.png');
  });
});

describe('Pokémon card ordering', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGetCachedData.mockReset();
    mockGetCachedData.mockResolvedValue(null);
    mockSetCachedData.mockReset();
    mockSetCachedData.mockResolvedValue(undefined);
  });

  it('sorts cards by release date from newest to oldest', () => {
    const cards = [
      { id: 'old-2', localId: '2', name: 'Old 2', set: { id: 'old', name: 'Old', releaseDate: '2020-01-01' } },
      { id: 'new-1', localId: '1', name: 'New 1', set: { id: 'new', name: 'New', releaseDate: '2024-01-01' } },
      { id: 'missing', localId: '3', name: 'Missing date' },
      { id: 'old-1', localId: '1', name: 'Old 1', set: { id: 'old', name: 'Old', releaseDate: '2020-01-01' } },
    ] satisfies TCGCard[];

    expect(sortCardsByReleaseDate(cards).map((card) => card.id)).toEqual(['new-1', 'old-1', 'old-2', 'missing']);
  });

  it('returns search summaries without blocking on every card detail', async () => {
    mockGet.mockResolvedValueOnce({
      data: [
        { id: 'pikachu-1', localId: '1', name: 'Pikachu', image: 'https://example.test/pikachu-1' },
        { id: 'pikachu-2', localId: '2', name: 'Pikachu V', image: 'https://example.test/pikachu-2' },
      ],
    });

    const cards = await getPokemonCards('Pikachu');

    expect(cards.map((card) => card.id)).toEqual(['pikachu-1', 'pikachu-2']);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/en/cards?'));
    expect(mockGet).not.toHaveBeenCalledWith(expect.stringMatching(/\/en\/cards\/[^?]/));
    expect(mockSetCachedData).toHaveBeenCalledWith(
      'tcg-pokemon-cards-v11-en-Pikachu',
      expect.arrayContaining([expect.objectContaining({ id: 'pikachu-1' })]),
    );
  });
});

describe('collection valuation loading', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGetCachedData.mockReset();
    mockGetCachedData.mockResolvedValue(null);
    mockSetCachedData.mockReset();
    mockSetCachedData.mockResolvedValue(undefined);
  });

  it('deduplicates owned IDs and reports priced coverage across currencies', async () => {
    mockGet.mockImplementation(async (url: string) => {
      const cardId = url.split('/').pop();
      if (cardId === 'missing-1') return { data: null };

      const pricing = cardId === 'usd-1'
        ? { tcgplayer: { unit: 'USD', normal: { marketPrice: 4.25 } } }
        : { cardmarket: { unit: 'EUR', trend: 2.5 } };

      return {
        data: {
          id: cardId,
          localId: '1',
          name: cardId,
          image: `https://example.test/${cardId}.png`,
          pricing,
        },
      };
    });

    await expect(
      fetchCollectionValue(['eur-1', 'usd-1', 'eur-1', 'missing-1'], 'en'),
    ).resolves.toEqual({
      groups: [
        { currency: 'USD', total: 4.25, count: 1 },
        { currency: 'EUR', total: 2.5, count: 1 },
      ],
      ownedCount: 3,
      pricedCount: 2,
    });
    expect(mockGet).toHaveBeenCalledTimes(3);
  });
});

describe('TCG catalog filtering and failures', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGetCachedData.mockReset();
    mockGetCachedData.mockResolvedValue(null);
    mockSetCachedData.mockReset();
    mockSetCachedData.mockResolvedValue(undefined);
  });

  it('applies owned-state filters with the current local ownership state', async () => {
    mockGet.mockResolvedValue({
      data: [
        { id: 'owned-card', localId: '1', name: 'Owned card', image: 'https://example.test/owned.png', rarity: 'Common', category: 'Pokemon', stage: 'Basic' },
        { id: 'other-card', localId: '2', name: 'Other card', image: 'https://example.test/other.png', rarity: 'Common', category: 'Pokemon', stage: 'Basic' },
      ],
    });

    const result = await searchCards(
      { selectedCategory: 'all', ownedState: 'owned' },
      'en',
      1,
      2,
      undefined,
      new Set(['owned-card']),
      new Set(),
    );

    expect(result.cards.map((card) => card.id)).toEqual(['owned-card']);
    expect(mockSetCachedData).not.toHaveBeenCalled();
  });

  it('rejects a catalog request without stale data instead of presenting an empty catalog', async () => {
    mockGet.mockRejectedValue(new Error('TCGdex unavailable'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(searchCards({ selectedCategory: 'all' })).rejects.toThrow('TCGdex unavailable');
    consoleError.mockRestore();
  });
});
