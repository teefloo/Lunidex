import type { SealedProduct } from '@primedex/core';

export interface SealedSaleProductCandidate {
  product: SealedProduct;
  availableQuantity: number;
}

interface SealedPositionWithProduct {
  product: SealedProduct;
  quantity: number;
}

/** Returns unique, sellable products while preserving the portfolio order. */
export function getSealedSaleProducts(
  positions: readonly SealedPositionWithProduct[],
): SealedSaleProductCandidate[] {
  const candidates = new Map<number, SealedSaleProductCandidate>();
  for (const position of positions) {
    if (!Number.isSafeInteger(position.quantity) || position.quantity <= 0) continue;
    const current = candidates.get(position.product.cardmarketProductId);
    if (current) {
      current.availableQuantity += position.quantity;
    } else {
      candidates.set(position.product.cardmarketProductId, {
        product: position.product,
        availableQuantity: position.quantity,
      });
    }
  }
  return [...candidates.values()];
}
