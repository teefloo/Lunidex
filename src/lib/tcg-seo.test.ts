import { describe, expect, it } from 'vitest';
import type { TCGCard, TCGSet } from '@/types/tcg';
import { getTCGSetCardCount, isIndexableTCGSetCardList } from './tcg-seo';

const set: TCGSet = {
  id: 'sv01',
  name: 'Scarlet & Violet',
  cardCount: { total: 2, official: 2 },
};

function card(id: string): TCGCard {
  return { id, localId: id, name: id };
}

describe('TCG public set SEO quality gate', () => {
  it('resolves the declared card count', () => {
    expect(getTCGSetCardCount(set)).toBe(2);
  });

  it('accepts a complete unique card list', () => {
    expect(isIndexableTCGSetCardList(set, [card('sv01-1'), card('sv01-2')])).toBe(true);
  });

  it('rejects empty, truncated, and duplicate card lists', () => {
    expect(isIndexableTCGSetCardList(set, [])).toBe(false);
    expect(isIndexableTCGSetCardList(set, [card('sv01-1')])).toBe(false);
    expect(isIndexableTCGSetCardList(set, [card('sv01-1'), card('sv01-1')])).toBe(false);
    expect(isIndexableTCGSetCardList(set, [{ ...card('sv01-1'), name: ' ' }, card('sv01-2')])).toBe(false);
  });

  it('rejects a list when the source does not declare a trusted count', () => {
    expect(getTCGSetCardCount({ totalCards: 1 })).toBe(0);
    expect(isIndexableTCGSetCardList({ totalCards: 1 }, [card('base-1')])).toBe(false);
  });

  it('rejects cards without a collector number', () => {
    expect(isIndexableTCGSetCardList(set, [{ ...card('sv01-1'), localId: '' }, card('sv01-2')])).toBe(false);
  });
});
