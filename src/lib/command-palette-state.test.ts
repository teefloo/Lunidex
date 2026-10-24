import { describe, expect, it } from 'vitest';

describe('command palette search state', () => {
  it('keeps the empty state hidden while searchable indexes are loading', async () => {
    const helpers = await import('./command-palette-state');
    const getEmptyState = Reflect.get(helpers, 'getCommandPaletteEmptyState');

    expect(typeof getEmptyState).toBe('function');
    if (typeof getEmptyState === 'function') {
      expect(getEmptyState({ hasQuery: true, isFetching: true, resultCount: 0 })).toBe('loading');
      expect(getEmptyState({ hasQuery: true, isFetching: false, resultCount: 0 })).toBe('empty');
      expect(getEmptyState({ hasQuery: true, isFetching: false, resultCount: 1 })).toBeNull();
      expect(getEmptyState({ hasQuery: false, isFetching: false, resultCount: 0 })).toBeNull();
    }
  });
});
