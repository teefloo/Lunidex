import type { TCGCard, TCGSet } from '@/types/tcg';

export const TCG_SET_IMAGE_PREVIEW_LIMIT = 36;

// Card detail URLs are public catalog pages. The optional `tcgLang` query
// selects card data, but it must never turn a valid card URL into a noindex
// page or make the page's indexability depend on the interface locale.
export const PUBLIC_TCG_CARD_ROBOTS = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
  },
} as const;

export function getTCGCardMetaDescriptionKey(
  rarity: string | null | undefined,
): 'tcg.card_meta_description' | 'tcg.card_meta_description_no_rarity' {
  const normalizedRarity = rarity?.trim().toLowerCase();
  const hasRarity = Boolean(normalizedRarity && !['none', 'n/a', 'unknown'].includes(normalizedRarity));
  return hasRarity ? 'tcg.card_meta_description' : 'tcg.card_meta_description_no_rarity';
}

export function getTCGSetPreviewCards(cards: TCGCard[]): TCGCard[] {
  return cards.slice(0, TCG_SET_IMAGE_PREVIEW_LIMIT);
}

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
