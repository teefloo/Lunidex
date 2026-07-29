import { describe, expect, it } from 'vitest';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from './nav-items';

describe('navigation scope', () => {
  it('keeps the five launch journeys in primary navigation', () => {
    expect(PRIMARY_NAV_ITEMS.map((item) => item.path)).toEqual([
      '/',
      '/team',
      '/tcg',
      '/tcg/collection',
      '/quiz',
    ]);
  });

  it('keeps the battle tools out of primary navigation', () => {
    expect(SECONDARY_NAV_ITEMS.map((item) => item.path)).toContain('/battle');
    expect(PRIMARY_NAV_ITEMS.map((item) => item.path)).not.toContain('/battle');
  });
});
