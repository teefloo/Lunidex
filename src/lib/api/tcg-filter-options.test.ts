import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), getCachedData: vi.fn(), setCachedData: vi.fn() }));
vi.mock('axios', () => ({ default: { create: vi.fn(() => ({ get: mocks.get })) } }));
vi.mock('axios-retry', () => ({ default: Object.assign(vi.fn(), { exponentialDelay: vi.fn(), isNetworkOrIdempotentRequestError: vi.fn() }) }));
vi.mock('@/lib/sentry-observability', () => ({ attachAxiosSentryInstrumentation: vi.fn(), reportFallback: vi.fn(), reportHttpFailure: vi.fn() }));
vi.mock('./cache', () => ({ getCachedData: mocks.getCachedData, setCachedData: mocks.setCachedData }));

describe('cold TCG filter catalog', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getCachedData.mockResolvedValue(null);
    mocks.setCachedData.mockResolvedValue(undefined);
  });

  it('uses one ordered manifest request and keeps the latest set first', async () => {
    mocks.get.mockResolvedValue({ data: [
      { id: 'me04', name: 'Latest', cardCount: { total: 200, official: 200 } },
      { id: 'base1', name: 'Base Set', cardCount: { total: 102, official: 102 } },
    ] });
    const { getFilterOptions } = await import('./tcg');
    const { sortTCGSetsNewestFirst } = await import('../tcg-research');
    const options = await getFilterOptions('en');
    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(mocks.get.mock.calls[0][0]).toBe('/en/sets?sort:field=releaseDate&sort:order=DESC');
    expect(sortTCGSetsNewestFirst(options.sets ?? []).map((set) => set.id)).toEqual(['me04', 'base1']);
    expect(options.categories).toContain('Pokemon');
  });

  it('fills missing artwork from the English compact catalog without replacing localized set data', async () => {
    mocks.get.mockImplementation((path: string) => {
      if (path.startsWith('/fr/sets?')) {
        return Promise.resolve({ data: [
          { id: 'base1', name: 'Set de Base', cardCount: { total: 102, official: 102 } },
          {
            id: 'base2',
            name: 'Jungle',
            logo: 'https://assets.tcgdex.net/fr/base/base2/logo',
            cardCount: { total: 64, official: 64 },
          },
        ] });
      }
      if (path.startsWith('/en/sets?')) {
        return Promise.resolve({ data: [
          {
            id: 'base2',
            name: 'Jungle',
            logo: 'https://assets.tcgdex.net/en/base/base2/logo',
            symbol: 'https://assets.tcgdex.net/univ/base/base2/symbol',
            cardCount: { total: 64, official: 64 },
          },
          {
            id: 'base1',
            name: 'Base Set',
            logo: 'https://assets.tcgdex.net/en/base/base1/logo',
            cardCount: { total: 102, official: 102 },
          },
        ] });
      }
      return Promise.reject(new Error(`Unexpected TCGdex request: ${path}`));
    });

    const { getCollectionSetCatalog } = await import('./tcg');
    const sets = await getCollectionSetCatalog('fr');
    const baseSet = sets.find((set) => set.id === 'base1');
    const jungle = sets.find((set) => set.id === 'base2');

    expect(mocks.get.mock.calls.map(([path]) => path)).toEqual([
      '/fr/sets?sort:field=releaseDate&sort:order=DESC',
      '/en/sets?sort:field=releaseDate&sort:order=DESC',
    ]);
    expect(baseSet).toMatchObject({
      id: 'base1',
      name: 'Set de Base',
      logo: 'https://assets.tcgdex.net/en/base/base1/logo.png',
      dataLanguage: 'fr',
    });
    expect(jungle).toMatchObject({
      id: 'base2',
      name: 'Jungle',
      logo: 'https://assets.tcgdex.net/fr/base/base2/logo.png',
      symbol: 'https://assets.tcgdex.net/univ/base/base2/symbol.png',
      dataLanguage: 'fr',
    });
    expect(mocks.setCachedData).toHaveBeenCalledWith(
      'tcg-collection-set-catalog-v2-fr',
      expect.arrayContaining([expect.objectContaining({ id: 'base1', name: 'Set de Base' })]),
    );
  });

  it('keeps the localized catalog usable when the English artwork fallback fails', async () => {
    mocks.get.mockImplementation((path: string) => {
      if (path.startsWith('/fr/sets?')) {
        return Promise.resolve({ data: [
          { id: 'base1', name: 'Set de Base', cardCount: { total: 102, official: 102 } },
        ] });
      }
      return Promise.reject(new Error('English catalog unavailable'));
    });

    const { getCollectionSetCatalog } = await import('./tcg');

    await expect(getCollectionSetCatalog('fr')).resolves.toMatchObject([
      { id: 'base1', name: 'Set de Base', dataLanguage: 'fr', logo: undefined, symbol: undefined },
    ]);
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });

  it('does not invent artwork when neither localized nor English set metadata provides it', async () => {
    const localizedSets = [
      { id: '30th', name: '30ᵉ Anniversaire', cardCount: { total: 130, official: 130 } },
      { id: '30th-c', name: 'Collection Classique 30ᵉ Anniversaire', cardCount: { total: 30, official: 30 } },
      { id: 'B1a', name: 'Embrasement Écarlate', cardCount: { total: 102, official: 102 } },
      { id: 'B2a', name: 'Merveilles de Paldea', cardCount: { total: 193, official: 193 } },
    ];
    const englishSets = [
      { id: '30th', name: '30th Celebration', cardCount: { total: 130, official: 130 } },
      { id: '30th-c', name: '30th Classic Collection', cardCount: { total: 30, official: 30 } },
      { id: 'B1a', name: 'Crimson Blaze', cardCount: { total: 102, official: 102 } },
      { id: 'B2a', name: 'Paldean Wonders', cardCount: { total: 193, official: 193 } },
    ];
    mocks.get.mockImplementation((path: string) => {
      if (path.startsWith('/fr/sets?')) return Promise.resolve({ data: localizedSets });
      if (path.startsWith('/en/sets?')) return Promise.resolve({ data: englishSets });
      return Promise.reject(new Error(`Unexpected TCGdex request: ${path}`));
    });

    const { getCollectionSetCatalog } = await import('./tcg');
    const sets = await getCollectionSetCatalog('fr');

    expect(sets.map(({ id, name, logo, symbol }) => ({ id, name, logo, symbol }))).toEqual([
      { id: '30th', name: '30ᵉ Anniversaire', logo: undefined, symbol: undefined },
      { id: '30th-c', name: 'Collection Classique 30ᵉ Anniversaire', logo: undefined, symbol: undefined },
      { id: 'B1a', name: 'Embrasement Écarlate', logo: undefined, symbol: undefined },
      { id: 'B2a', name: 'Merveilles de Paldea', logo: undefined, symbol: undefined },
    ]);
    expect(mocks.get.mock.calls.map(([path]) => path)).toEqual([
      '/fr/sets?sort:field=releaseDate&sort:order=DESC',
      '/en/sets?sort:field=releaseDate&sort:order=DESC',
    ]);
  });
});
