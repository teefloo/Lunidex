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

import { getAllSets, getFilterOptions, sortCardsByReleaseDate } from './tcg';
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
});

describe('Pokémon card ordering', () => {
  it('sorts cards by release date from newest to oldest', () => {
    const cards = [
      { id: 'old-2', localId: '2', name: 'Old 2', set: { id: 'old', name: 'Old', releaseDate: '2020-01-01' } },
      { id: 'new-1', localId: '1', name: 'New 1', set: { id: 'new', name: 'New', releaseDate: '2024-01-01' } },
      { id: 'missing', localId: '3', name: 'Missing date' },
      { id: 'old-1', localId: '1', name: 'Old 1', set: { id: 'old', name: 'Old', releaseDate: '2020-01-01' } },
    ] satisfies TCGCard[];

    expect(sortCardsByReleaseDate(cards).map((card) => card.id)).toEqual(['new-1', 'old-1', 'old-2', 'missing']);
  });
});
