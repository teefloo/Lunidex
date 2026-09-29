import type { TCGDisplayCurrency } from '@/lib/tcg-currency';
import type { TCGCard, TCGCardValue } from '@/types/tcg';

export interface TCGCollectionValuedCard {
  card: TCGCard;
  value: TCGCardValue;
}

/** Rank unique owned cards in one currency, keeping the best owned finish. */
export function selectTopValuedCollectionCards(
  candidates: readonly TCGCollectionValuedCard[],
  currency: TCGDisplayCurrency | undefined,
  limit = 3,
): TCGCollectionValuedCard[] {
  if (!currency || !Number.isFinite(limit) || limit <= 0) return [];
  const bestById = new Map<string, TCGCollectionValuedCard>();
  for (const candidate of candidates) {
    if (
      candidate.value.currency.toUpperCase() !== currency
      || !Number.isFinite(candidate.value.amount)
      || candidate.value.amount <= 0
    ) continue;
    const existing = bestById.get(candidate.card.id);
    if (!existing || candidate.value.amount > existing.value.amount) {
      bestById.set(candidate.card.id, candidate);
    }
  }
  return [...bestById.values()]
    .sort((left, right) => right.value.amount - left.value.amount
      || left.card.id.localeCompare(right.card.id, undefined, { numeric: true, sensitivity: 'base' }))
    .slice(0, Math.floor(limit));
}
