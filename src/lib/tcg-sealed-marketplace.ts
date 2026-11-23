import { getSealedCardmarketUrl } from '@primedex/core/lib/sealed-catalogue';

interface SealedCardmarketLinkSource {
  cardmarketProductId: number;
  cardmarketUrl: string;
}

/** Returns only the canonical French Cardmarket product URL for this product ID. */
export function getSealedProductCardmarketUrl(product: SealedCardmarketLinkSource): string | null {
  if (!Number.isSafeInteger(product.cardmarketProductId) || product.cardmarketProductId <= 0) return null;

  const expectedUrl = getSealedCardmarketUrl(product.cardmarketProductId);
  return product.cardmarketUrl === expectedUrl ? expectedUrl : null;
}
