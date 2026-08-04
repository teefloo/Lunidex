import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HOME_FEATURED_CARDS, useHomeFeaturedCards } from './useHomeFeaturedCards';

describe('useHomeFeaturedCards', () => {
  it('keeps the requested vintage cards in a stable order', () => {
    const { result } = renderHook(() => useHomeFeaturedCards(true));

    expect(result.current.cards).toBe(HOME_FEATURED_CARDS);
    expect(result.current.cards.map((card) => card.id)).toEqual([
      'miscp_ja-37',
      'wotc-presentation-009-165r',
      'base1-4',
    ]);
  });

  it('waits for the mounted homepage before rendering cards', () => {
    const { result } = renderHook(() => useHomeFeaturedCards(false));

    expect(result.current.cards).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });
});
