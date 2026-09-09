import { describe, expect, it } from 'vitest';
import type { TCGCardFilters } from '@/types/tcg';
import { isInitialTcgCatalogCompatible } from './tcg-research';

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
