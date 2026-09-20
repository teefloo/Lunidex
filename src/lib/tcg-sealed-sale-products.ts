import type { SealedProduct, SealedProductLanguage } from '@primedex/core';

export interface SealedSaleProductCandidate {
  product: SealedProduct;
  availableQuantity: number;
}

interface SealedPositionWithProduct {
  product: SealedProduct;
  quantity: number;
}

interface SealedExchangePositionWithProduct {
  product: SealedProduct;
  language: SealedProductLanguage;
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

export interface SealedExchangeProductCandidate {
  product: SealedProduct;
  language: SealedProductLanguage;
  availableQuantity: number;
}

/** Returns owned exchange sources keyed by product and language. */
export function getSealedExchangeProducts(
  positions: readonly SealedExchangePositionWithProduct[],
): SealedExchangeProductCandidate[] {
  const candidates = new Map<string, SealedExchangeProductCandidate>();
  for (const position of positions) {
    if (!Number.isSafeInteger(position.quantity) || position.quantity <= 0) continue;
    const key = `${position.product.cardmarketProductId}:${position.language}`;
    const current = candidates.get(key);
    if (current) {
      current.availableQuantity += position.quantity;
    } else {
      candidates.set(key, {
        product: position.product,
        language: position.language,
        availableQuantity: position.quantity,
      });
    }
  }
  return [...candidates.values()];
}
