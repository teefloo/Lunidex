import { describe, expect, it } from 'vitest';
import type { TCGCardFilters } from '@/types/tcg';
import { clearTCGCardSearch, isInitialTcgCatalogCompatible, resetTCGCardFilters } from './tcg-research';

const initialFilters: TCGCardFilters = {
  selectedSet: 'me03',
  selectedCategory: 'all',
  sortBy: 'id',
  sortOrder: 'asc',
  ownedState: 'all',
};

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
