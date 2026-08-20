import { describe, expect, it } from 'vitest';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from './nav-items';

describe('navigation scope', () => {
  it('keeps the six launch journeys in primary navigation', () => {
    expect(PRIMARY_NAV_ITEMS.map((item) => item.path)).toEqual([
      '/pokedex',
      '/team',
      '/tcg',
      '/tcg/collection',
      '/quiz',
      '/blog',
    ]);
  });

  it('keeps the battle tools out of primary navigation', () => {
    expect(SECONDARY_NAV_ITEMS.map((item) => item.path)).toContain('/battle');
    expect(PRIMARY_NAV_ITEMS.map((item) => item.path)).not.toContain('/battle');
  });
});
