import { describe, expect, it } from 'vitest';
import type { TCGCardFilters, TCGSet } from '@/types/tcg';
import {
  clearTCGCardSearch,
  getLatestTCGSet,
  isInitialTcgCatalogCompatible,
  resetTCGCardFilters,
  sortTCGSetsNewestFirst,
} from './tcg-research';

const initialFilters: TCGCardFilters = {
  selectedSet: 'me03',
  selectedCategory: 'all',
  sortBy: 'id',
  sortOrder: 'asc',
  ownedState: 'all',
};

describe('TCG set release ordering', () => {
  const sets: TCGSet[] = [
    { id: 'me03', name: 'Perfect Order', releaseDate: '2026-03-27' },
    { id: 'me04', name: 'Phantasmal Flames', releaseDate: '2026-05-22' },
  ];

  it('sorts by release date and selects the newest set instead of a fixed default', () => {
    expect(sortTCGSetsNewestFirst(sets).map((set) => set.id)).toEqual(['me04', 'me03']);
    expect(getLatestTCGSet(sets)).toMatchObject({ id: 'me04', name: 'Phantasmal Flames' });
  });

  it('returns no default when the set catalog is empty', () => {
    expect(getLatestTCGSet([])).toBeNull();
  });
  it('preserves compact catalog release order without fetching every release date', () => {
    const ranked = [
      { id: 'base1', name: 'Base Set', releaseRank: 2 },
      { id: 'me04', name: 'Latest', releaseRank: 0 },
      { id: 'me03', name: 'Previous', releaseRank: 1 },
    ];
    expect(sortTCGSetsNewestFirst(ranked).map((set) => set.id)).toEqual(['me04', 'me03', 'base1']);
    expect(getLatestTCGSet(ranked)?.id).toBe('me04');
  });
});

describe('isInitialTcgCatalogCompatible', () => {
  it('accepts the exact server-rendered latest-set query', () => {
    expect(isInitialTcgCatalogCompatible(initialFilters, 'me03', 'fr', 'fr', true)).toBe(true);
  });

  it('rejects a different set so its cards must be fetched', () => {
    expect(isInitialTcgCatalogCompatible({ ...initialFilters, selectedSet: 'sv10' }, 'me03', 'fr', 'fr', true)).toBe(false);
  });

  it('rejects searches and non-default filters that the preview does not contain', () => {
    expect(isInitialTcgCatalogCompatible({ ...initialFilters, searchTerm: 'pikachu' }, 'me03', 'fr', 'fr', true)).toBe(false);
    expect(isInitialTcgCatalogCompatible({ ...initialFilters, sortBy: 'name' }, 'me03', 'fr', 'fr', true)).toBe(false);
    expect(isInitialTcgCatalogCompatible(initialFilters, 'me03', 'fr', 'en', true)).toBe(false);
  });
});

describe('catalog filter recovery', () => {
  it('resets to the latest set and bounded default sort', () => {
    expect(resetTCGCardFilters('sv10')).toEqual({
      selectedCategory: 'all',
      selectedSet: 'sv10',
      sortBy: 'id',
      sortOrder: 'asc',
      ownedState: 'all',
    });
  });

  it('keeps an active set when clearing a search', () => {
    expect(clearTCGCardSearch({ ...initialFilters, searchTerm: 'pikachu', sortBy: 'marketPrice' }, 'sv10')).toMatchObject({
      searchTerm: undefined,
      selectedSet: 'me03',
      sortBy: 'marketPrice',
    });
  });

  it('falls back to the latest set after clearing a global search', () => {
    expect(clearTCGCardSearch({ ...initialFilters, selectedSet: null, searchTerm: 'pikachu' }, 'sv10').selectedSet).toBe('sv10');
  });
});
