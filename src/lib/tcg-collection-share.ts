import {
  normalizeTCGCustomCollectionCards,
  normalizeTCGCustomCollections,
  type TCGCustomCollection,
  type TCGCustomCollectionCard,
} from '@primedex/core/lib/tcg-custom-collections';
import { normalizeUserStateData } from '@/lib/tcg-owned-cards';

export interface ShareableTCGCollection {
  collection: TCGCustomCollection;
  cards: TCGCustomCollectionCard[];
}

/** Read only the custom binder projection that an unlisted share may expose. */
export function getShareableTCGCollection(
  value: unknown,
  collectionId: string,
): ShareableTCGCollection | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const normalizedState = normalizeUserStateData(value as Record<string, unknown>);
  if (!normalizedState) return null;

  const collections = normalizeTCGCustomCollections(normalizedState.tcgCustomCollections ?? []);
  if (!collections) return null;
  const collection = collections.find((entry) => entry.id === collectionId.toLowerCase());
  if (!collection) return null;

  const cards = normalizeTCGCustomCollectionCards(
    normalizedState.tcgCustomCollectionCards ?? [],
    collections.map((entry) => entry.id),
  );
  if (!cards) return null;

  return { collection, cards: cards.filter((card) => card.collectionId === collection.id) };
}

export interface TCGSharePage {
  page: number;
  pageSize: number;
}

export const TCG_SHARE_PAGE_SIZE = 24;
export const TCG_SHARE_MAX_PAGE_SIZE = 48;

export function normalizeTCGSharePage(searchParams: URLSearchParams): TCGSharePage {
  const pageValue = Number(searchParams.get('page') ?? 1);
  const sizeValue = Number(searchParams.get('pageSize') ?? TCG_SHARE_PAGE_SIZE);
  return {
    page: Number.isSafeInteger(pageValue) && pageValue > 0 ? Math.min(pageValue, 10_000) : 1,
    pageSize: Number.isSafeInteger(sizeValue) && sizeValue > 0
      ? Math.min(sizeValue, TCG_SHARE_MAX_PAGE_SIZE)
      : TCG_SHARE_PAGE_SIZE,
  };
}

export function sliceTCGShareCards<T>(cards: readonly T[], page: TCGSharePage): T[] {
  const start = (page.page - 1) * page.pageSize;
  return cards.slice(start, start + page.pageSize);
}
