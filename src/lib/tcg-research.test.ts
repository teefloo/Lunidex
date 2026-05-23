import { describe, expect, it } from 'vitest';
import { DEFAULT_TCG_CARD_FILTERS } from '@/lib/api/tcg';
import type { TCGCardViewMode } from '@/types/tcg';
import { parseTCGSearchState, serializeTCGSearchState } from './tcg-research';

describe('tcg-research', () => {
  it('normalizes compact view URLs to the visual view', () => {
    const state = parseTCGSearchState(new URLSearchParams('view=compact'));

    expect(state.viewMode).toBe('visual');
  });

  it('defaults empty or invalid category filters to all', () => {
    expect(parseTCGSearchState(new URLSearchParams()).filters.selectedCategory).toBe('all');
    expect(parseTCGSearchState(new URLSearchParams('category=')).filters.selectedCategory).toBe('all');
    expect(parseTCGSearchState(new URLSearchParams('category=not-a-real-category')).filters.selectedCategory).toBe('all');
  });

  it('does not serialize the compact view mode', () => {
    const query = serializeTCGSearchState({
      filters: DEFAULT_TCG_CARD_FILTERS,
      viewMode: 'compact' as unknown as TCGCardViewMode,
      compare: [],
    });

    expect(query).not.toContain('view=');
  });
});
