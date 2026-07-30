import { describe, expect, it } from 'vitest';
import { resolveCollectionEntry } from './tcg-collection-entry';

describe('resolveCollectionEntry', () => {
  it.each([
    [{ hasHydrated: false, ownedCount: 3 }, { mode: 'start', path: '/tcg/start?source=home_cta' }],
    [{ hasHydrated: true, ownedCount: 0 }, { mode: 'start', path: '/tcg/start?source=home_cta' }],
    [{ hasHydrated: true, ownedCount: 1 }, { mode: 'resume', path: '/tcg/collection' }],
  ] as const)('resolves %#', (input, expected) => {
    expect(resolveCollectionEntry(input)).toEqual(expected);
  });
});
