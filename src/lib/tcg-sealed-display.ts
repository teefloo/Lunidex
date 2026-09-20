import type { SealedTransaction, SealedTransactionDraft } from '@primedex/core';

type SealedExchangeSummaryInput = Pick<
  SealedTransactionDraft,
  'kind' | 'quantity' | 'cardmarketProductId' | 'exchangeGive'
>;

export function formatSealedExchangeSummary(
  transaction: SealedExchangeSummaryInput,
  names: ReadonlyMap<number, string>,
): string | null {
  if (transaction.kind !== 'exchange' || !transaction.exchangeGive) return null;
  const givenName = names.get(transaction.exchangeGive.cardmarketProductId) ?? `#${transaction.exchangeGive.cardmarketProductId}`;
  const receivedName = names.get(transaction.cardmarketProductId) ?? `#${transaction.cardmarketProductId}`;
  return `${transaction.exchangeGive.quantity} × ${givenName} → ${transaction.quantity} × ${receivedName}`;
}

export function getSealedTransactionProductIds(transaction: SealedTransaction): number[] {
  return [...new Set([
    transaction.cardmarketProductId,
    ...(transaction.exchangeGive ? [transaction.exchangeGive.cardmarketProductId] : []),
  ])];
}
