import { describe, expect, it } from 'vitest';
import { getTCGSetIdsFromWishlist } from './tcg-wishlist';

describe('TCG wishlist set selection', () => {
  it('keeps only the set prefixes needed by wishlist cards', () => {
    expect(getTCGSetIdsFromWishlist([
      'me02.5-201',
      'me02.5-279',
      'sv01-001',
      'malformed',
      ' ',
    ])).toEqual(['me02.5', 'sv01']);
  });
});
