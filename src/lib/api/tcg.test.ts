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
  isTcgLangSupported,
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

describe('TCG locale support', () => {
  it('does not treat the English fallback as a Chinese indexable locale', () => {
    expect(isTcgLangSupported('en')).toBe(true);
    expect(isTcgLangSupported('fr')).toBe(true);
    expect(isTcgLangSupported('zh')).toBe(false);
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

describe('TCG catalog ID ordering', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGetCachedData.mockReset();
    mockGetCachedData.mockResolvedValue(null);
    mockSetCachedData.mockReset();
    mockSetCachedData.mockResolvedValue(undefined);
  });

  it('sorts unpadded Sword & Shield IDs naturally without changing padded IDs', async () => {
    const swordShieldCards = ['1', '2', '9', '10', '11', '99', '100', '101', '216']
      .map((localId) => ({
        id: `swsh1-${localId}`,
        localId,
        name: `Sword & Shield ${localId}`,
        image: `https://example.test/swsh1-${localId}.png`,
        rarity: 'Common' as const,
        category: 'Pokemon' as const,
        stage: 'Basic',
      }));
    const paddedCards = ['001', '002', '009', '010'].map((localId) => ({
      id: `me03-${localId}`,
      localId,
      name: `Perfect Order ${localId}`,
      image: `https://example.test/me03-${localId}.png`,
      rarity: 'Common' as const,
      category: 'Pokemon' as const,
      stage: 'Basic',
    }));

    mockGet.mockImplementation(async (url: string) => {
      const params = new URLSearchParams(url.split('?')[1] ?? '');
      const cards = params.get('set.id') === 'eq:swsh1' ? swordShieldCards : paddedCards;
      return { data: cards };
    });

    const swordShield = await searchCards(
      { selectedCategory: 'all', selectedSet: 'swsh1', sortBy: 'id', sortOrder: 'asc' },
      'en',
      1,
      24,
    );
    const swordShieldDescending = await searchCards(
      { selectedCategory: 'all', selectedSet: 'swsh1', sortBy: 'id', sortOrder: 'desc' },
      'en',
      1,
      24,
    );
    const padded = await searchCards(
      { selectedCategory: 'all', selectedSet: 'me03', sortBy: 'id', sortOrder: 'asc' },
      'en',
      1,
      24,
    );

    expect(swordShield.cards.map((card) => card.id)).toEqual([
      'swsh1-1',
      'swsh1-2',
      'swsh1-9',
      'swsh1-10',
      'swsh1-11',
      'swsh1-99',
      'swsh1-100',
      'swsh1-101',
      'swsh1-216',
    ]);
    expect(swordShieldDescending.cards.map((card) => card.id)).toEqual([
      'swsh1-216',
      'swsh1-101',
      'swsh1-100',
      'swsh1-99',
      'swsh1-11',
      'swsh1-10',
      'swsh1-9',
      'swsh1-2',
      'swsh1-1',
    ]);
    expect(padded.cards.map((card) => card.id)).toEqual([
      'me03-001',
      'me03-002',
      'me03-009',
      'me03-010',
    ]);
  });
});

describe('TCG catalog price sorting and filtering', () => {
  // Name-ordered summaries mirror the TCGdex listing endpoint: no pricing.
  // The most expensive cards sit alphabetically deep in the set, like
  // Méga-Darkrai-ex does in "Nuit Noire" (me05).
  const setSummaries = [
    { id: 'me05-001', localId: '001', name: 'Abra', image: 'https://example.test/me05-001.png' },
    { id: 'me05-010', localId: '010', name: 'Bulbasaur', image: 'https://example.test/me05-010.png' },
    { id: 'me05-020', localId: '020', name: 'Charizard', image: 'https://example.test/me05-020.png' },
    { id: 'me05-030', localId: '030', name: 'Ditto', image: 'https://example.test/me05-030.png' },
    { id: 'me05-116', localId: '116', name: 'Zard gold', image: 'https://example.test/me05-116.png' },
  ];

  const detailPricing: Record<string, unknown> = {
    'me05-001': { cardmarket: { unit: 'EUR', trend: 1 } },
    // Displayed price is the Cardmarket EUR trend (€250), even though the
    // TCGplayer USD market price is far lower than other cards'.
    'me05-010': { cardmarket: { unit: 'EUR', trend: 250 } },
    // Displayed price is €16; its TCGplayer USD price (999) must NOT drive
    // sorting or filtering because users never see that value.
    'me05-020': {
      cardmarket: { unit: 'EUR', trend: 16 },
      tcgplayer: { unit: 'USD', normal: { marketPrice: 999 } },
    },
    'me05-030': {},
    'me05-116': { cardmarket: { unit: 'EUR', trend: 263.35 } },
  };

  function mockCatalogResponses() {
    mockGet.mockImplementation(async (url: string) => {
      if (url.startsWith('/en/cards?')) {
        const params = new URLSearchParams(url.split('?')[1] ?? '');
        const page = Number(params.get('pagination:page') ?? '1');
        const size = Number(params.get('pagination:itemsPerPage') ?? '100');
        return { data: setSummaries.slice((page - 1) * size, page * size) };
      }

      const cardId = url.split('/').pop() ?? '';
      if (!(cardId in detailPricing)) throw new Error(`Unexpected TCG API request: ${url}`);
      const summary = setSummaries.find((card) => card.id === cardId);
      return {
        data: {
          ...summary,
          rarity: 'Rare',
          category: 'Pokemon',
          stage: 'Basic',
          pricing: detailPricing[cardId],
        },
      };
    });
  }

  beforeEach(() => {
    mockGet.mockReset();
    mockGetCachedData.mockReset();
    mockGetCachedData.mockResolvedValue(null);
    mockSetCachedData.mockReset();
    mockSetCachedData.mockResolvedValue(undefined);
  });

  it('sorts by price across the complete set before slicing a page', async () => {
    mockCatalogResponses();

    const result = await searchCards(
      { selectedCategory: 'all', sortBy: 'marketPrice', sortOrder: 'desc' },
      'en',
      1,
      2,
    );

    // The full set (5 cards, fetched across 2 name-ordered remote pages) is
    // ranked before the page slice, so the €263 card wins even though it sits
    // alphabetically last. The pre-fix behavior pooled only the first page and
    // returned ['me05-020', 'me05-010'].
    expect(result.cards.map((card) => card.id)).toEqual(['me05-116', 'me05-010']);
    expect(result.hasMore).toBe(true);
    expect(mockGet).toHaveBeenCalledWith('/en/cards/me05-116');
  });

  it('sorts ascending with unpriced cards last', async () => {
    mockCatalogResponses();

    const result = await searchCards(
      { selectedCategory: 'all', sortBy: 'marketPrice', sortOrder: 'asc' },
      'en',
      1,
      24,
    );

    expect(result.cards.map((card) => card.id)).toEqual([
      'me05-001',
      'me05-020',
      'me05-010',
      'me05-116',
      'me05-030',
    ]);
    expect(result.hasMore).toBe(false);
  });

  it('filters on the displayed price source, not an alternative provider value', async () => {
    mockCatalogResponses();

    const affordable = await searchCards(
      { selectedCategory: 'all', priceMax: 100 },
      'en',
      1,
      24,
    );

    // Charizard displays €16 so it belongs in a ≤ €100 filter even though its
    // TCGplayer USD price is 999; Ditto has no displayed price at all.
    expect(affordable.cards.map((card) => card.id).sort()).toEqual(['me05-001', 'me05-020']);

    const expensive = await searchCards(
      { selectedCategory: 'all', priceMin: 200 },
      'en',
      1,
      24,
    );

    expect(expensive.cards.map((card) => card.id)).toEqual(['me05-010', 'me05-116']);
  });
});
