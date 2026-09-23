import { describe, expect, it } from 'vitest';
import { getCachedTcgCardsOrThrow } from './tcg-error-fallback';

describe('TCG card request failures', () => {
  it('returns stale cards when they are available', () => {
    const staleCards = [{ id: 'swsh1-1' }];
    expect(getCachedTcgCardsOrThrow(staleCards, new Error('upstream unavailable'))).toBe(staleCards);
  });

  it('propagates an upstream error when there is no stale cache', () => {
    const error = new Error('upstream unavailable');
    expect(() => getCachedTcgCardsOrThrow(null, error)).toThrow(error);
  });
});
