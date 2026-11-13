import type { TCGCustomCollectionCardDetail } from '@/lib/api/tcg';
import { getCardMarketValue } from '@/lib/tcg-collection';
import type { TCGCustomCollectionCard } from '@primedex/core/lib/tcg-custom-collections';
import type { TCGDisplayCurrency } from '@/lib/tcg-currency';

export interface TCGCustomCollectionCardFilters {
  search: string;
  language: string;
  rarity: string;
  setId: string;
  priceOrder: 'none' | 'asc' | 'desc';
  displayCurrency: TCGDisplayCurrency;
}

/** Whether the visible cards are a temporary view of the saved binder order. */
export function hasTCGCustomCollectionCardViewTransform(filters: TCGCustomCollectionCardFilters): boolean {
  return Boolean(
    normalizeSearch(filters.search)
    || filters.language
    || filters.rarity
    || filters.setId
    || filters.priceOrder !== 'none',
  );
}

/** Return an adjacent page from the page currently displayed after layout clamping. */
export function getTCGCustomCollectionPageNavigationTarget(
  displayedPage: number,
  pageCount: number,
  direction: 'previous' | 'next',
): number {
  const boundedPageCount = Math.max(1, pageCount);
  const boundedDisplayedPage = Math.min(boundedPageCount, Math.max(1, displayedPage));
  const nextPage = boundedDisplayedPage + (direction === 'next' ? 1 : -1);
  return Math.min(boundedPageCount, Math.max(1, nextPage));
}

function normalizeSearch(value: string): string {
  return value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase().trim();
}

function cardKey(card: Pick<TCGCustomCollectionCard, 'cardId' | 'language'>): string {
  return `${card.language}:${card.cardId.toLocaleLowerCase()}`;
}

/** Apply user-selected filters to every binder entry before the caller paginates. */
export function filterAndSortTCGCustomCollectionCards(
  references: readonly TCGCustomCollectionCard[],
  details: readonly TCGCustomCollectionCardDetail[],
  filters: TCGCustomCollectionCardFilters,
): TCGCustomCollectionCard[] {
  const detailByCard = new Map(details.map((detail) => [cardKey(detail.ref), detail]));
  const query = normalizeSearch(filters.search);

  const filtered = references.filter((reference) => {
    if (filters.language && reference.language !== filters.language) return false;
    const detail = detailByCard.get(cardKey(reference));
    const card = detail?.card;
    if (filters.rarity && card?.rarity !== filters.rarity) return false;
    if (filters.setId && card?.set?.id !== filters.setId) return false;
    if (!query) return true;
    const searchFields = [
      reference.cardName,
      reference.cardId,
      reference.language,
      card?.name,
      card?.localId,
      card?.set?.name,
      card?.rarity,
    ].filter((value): value is string => Boolean(value));
    return normalizeSearch(searchFields.join(' ')).includes(query);
  });

  if (filters.priceOrder === 'none') return filtered;

  return filtered
    .map((reference, index) => ({
      reference,
      index,
      price: getCardMarketValue(detailByCard.get(cardKey(reference))?.card ?? { id: reference.cardId, localId: '', name: reference.cardName }, filters.displayCurrency)?.amount,
    }))
    .sort((left, right) => {
      if (left.price === undefined && right.price !== undefined) return 1;
      if (left.price !== undefined && right.price === undefined) return -1;
      if (left.price !== undefined && right.price !== undefined) {
        const priceDifference = filters.priceOrder === 'asc'
          ? left.price - right.price
          : right.price - left.price;
        if (priceDifference !== 0) return priceDifference;
      }
      return left.index - right.index;
    })
    .map(({ reference }) => reference);
}
