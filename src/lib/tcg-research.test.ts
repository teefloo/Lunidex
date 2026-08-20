import { describe, expect, it } from 'vitest';

import {
  MAX_TCG_FILTER_ITEM_LENGTH,
  MAX_TCG_FILTER_LIST_ITEMS,
  MAX_TCG_NUMERIC_FILTER,
  MAX_TCG_SEARCH_VALUE_LENGTH,
  parseTCGSearchState,
} from './tcg-research';

describe('TCG search input bounds', () => {
  it('bounds free-text and list filters before building upstream queries', () => {
    const params = new URLSearchParams({
      q: 'x'.repeat(MAX_TCG_SEARCH_VALUE_LENGTH + 20),
      types: Array.from({ length: MAX_TCG_FILTER_LIST_ITEMS + 4 }, (_, index) => (
        `${'y'.repeat(MAX_TCG_FILTER_ITEM_LENGTH + 10)}-${index}`
      )).join(','),
    });

    const state = parseTCGSearchState(params);

    expect(state.filters.searchTerm).toHaveLength(MAX_TCG_SEARCH_VALUE_LENGTH);
    expect(state.filters.selectedTypes).toHaveLength(MAX_TCG_FILTER_LIST_ITEMS);
    expect(state.filters.selectedTypes?.[0]).toHaveLength(MAX_TCG_FILTER_ITEM_LENGTH);
  });

  it('ignores negative and oversized numeric filters', () => {
    const params = new URLSearchParams({
      minHp: '-1',
      maxHp: String(MAX_TCG_NUMERIC_FILTER + 1),
      priceMin: '12.5',
    });

    const { filters } = parseTCGSearchState(params);

    expect(filters.minHp).toBeUndefined();
    expect(filters.maxHp).toBeUndefined();
    expect(filters.priceMin).toBe(12.5);
  });
});
