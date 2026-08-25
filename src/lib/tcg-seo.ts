import type { TCGCard, TCGSet } from '@/types/tcg';

/**
 * Resolve the trusted card count used by the public set page.
 *
 * TCGdex exposes the authoritative count as `cardCount.total`. Do not infer
 * it from the rendered card array: an incomplete upstream response must fail
 * closed instead of becoming an indexable checklist.
 */
export function getTCGSetCardCount(set: Pick<TCGSet, 'cardCount' | 'totalCards'>): number {
  const count = set.cardCount?.total;
  return typeof count === 'number' && Number.isInteger(count) && count > 0 ? count : 0;
}

/**
 * A public set page is indexable only when its card list is usable and not
 * obviously truncated compared with the upstream set count.
 */
export function isIndexableTCGSetCardList(set: Pick<TCGSet, 'cardCount' | 'totalCards'>, cards: TCGCard[]): boolean {
  if (cards.length === 0) return false;

  if (cards.some((card) => !card.id.trim() || !card.name.trim() || !(card.localId?.trim() || card.number?.trim()))) {
    return false;
  }

  const cardIds = cards.map((card) => card.id.trim());
  if (cardIds.length !== cards.length || new Set(cardIds).size !== cardIds.length) return false;

  const declaredCount = getTCGSetCardCount(set);
  return declaredCount > 0 && cards.length >= declaredCount;
}
