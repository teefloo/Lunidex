import { describe, expect, it } from 'vitest';
import {
  calculateSealedCashCents,
  calculateSealedFees,
  replaySealedLedger,
  selectSealedValuation,
  SealedDomainError,
  validateSealedTransactionDraft,
} from './sealed-ledger';
import { calculateSealedCashflow, summarizeSealedPortfolio } from './sealed-analytics';
import type {
  SealedPriceSnapshot,
  SealedTransaction,
  SealedTransactionDraft,
  SealedProduct,
} from '../types/sealed';

const now = new Date('2026-09-10T12:00:00Z');

function draft(overrides: Partial<SealedTransactionDraft> = {}): SealedTransactionDraft {
  return {
    kind: 'buy',
    cardmarketProductId: 100,
    language: 'fr',
    date: '2026-09-01',
    quantity: 2,
    unitPriceCents: 1_000,
    feesCents: 100,
    shippingCents: 200,
    discountCents: 50,
    paymentFeesCents: 0,
    otherCostsCents: 0,
    platform: 'Cardmarket',
    counterparty: 'Seller',
    notes: '',
    storage: 'Shelf A',
    allocationMethod: 'fifo',
    selections: [],
    ...overrides,
  };
}

function transaction(
  id: string,
  overrides: Partial<SealedTransactionDraft> = {},
): SealedTransaction {
  const value = draft(overrides);
  return {
    ...value,
    id,
    revision: 1,
    createdAt: `${value.date}T10:00:00.000Z`,
    updatedAt: `${value.date}T10:00:00.000Z`,
    voided: false,
  };
}

function exchangeTransaction(
  id: string,
  overrides: Record<string, unknown> = {},
): SealedTransaction {
  const { exchangeGive: exchangeGiveOverride, ...transactionOverrides } = overrides;
  const value = transaction(id, {
    cardmarketProductId: 200,
    language: 'fr',
    quantity: 1,
    unitPriceCents: 0,
    feesCents: 0,
    shippingCents: 0,
    discountCents: 0,
    paymentFeesCents: 0,
    otherCostsCents: 0,
    ...transactionOverrides,
    kind: 'exchange' as unknown as SealedTransactionDraft['kind'],
  });
  return {
    ...value,
    kind: 'exchange',
    exchangeGive: exchangeGiveOverride ?? {
      cardmarketProductId: 100,
      language: 'fr',
      quantity: 1,
    },
  } as unknown as SealedTransaction;
}

describe('sealed ledger', () => {
  it('calculates buy and sell cash with the same fee semantics as scelle', () => {
    const buy = draft();
    expect(calculateSealedFees(buy)).toBe(300);
    expect(calculateSealedCashCents(buy)).toBe(-2_250);

    const sell = draft({
      kind: 'sell',
      date: '2026-09-10',
      unitPriceCents: 1_500,
      feesCents: 100,
      shippingCents: 50,
      discountCents: 0,
      paymentFeesCents: 25,
      otherCostsCents: 10,
    });
    expect(calculateSealedFees(sell)).toBe(185);
    expect(calculateSealedCashCents(sell)).toBe(2_815);
  });

  it('replays FIFO lots, including proportional costs and holding days', () => {
    const result = replaySealedLedger([
      transaction('buy-1'),
      transaction('buy-2', { date: '2026-09-03', quantity: 1, unitPriceCents: 2_000, feesCents: 0, shippingCents: 0, discountCents: 0 }),
      transaction('sale-1', {
        kind: 'sell',
        date: '2026-09-10',
        quantity: 2,
        unitPriceCents: 1_500,
        feesCents: 100,
        shippingCents: 0,
        discountCents: 0,
        paymentFeesCents: 20,
        otherCostsCents: 0,
      }),
    ]);

    expect(result.sales).toHaveLength(1);
    expect(result.sales[0].allocations.map((allocation) => allocation.lotId)).toEqual(['buy-1']);
    expect(result.sales[0].costCents).toBe(2_250);
    expect(result.sales[0].netCents).toBe(2_880);
    expect(result.sales[0].profitCents).toBe(630);
    expect(result.sales[0].holdingDays).toBe(9);
    expect(result.positions[0]).toMatchObject({ quantity: 1, bought: 3, sold: 2, realizedCents: 630 });
  });

  it('supports manual allocations and rejects incomplete or incompatible lots', () => {
    const buyOne = transaction('buy-1', { quantity: 2 });
    const buyTwo = transaction('buy-2', { date: '2026-09-02', quantity: 2, unitPriceCents: 2_000, feesCents: 0, shippingCents: 0, discountCents: 0 });
    const sale = transaction('sale-1', {
      kind: 'sell',
      date: '2026-09-10',
      quantity: 2,
      unitPriceCents: 3_000,
      discountCents: 0,
      allocationMethod: 'manual',
      selections: [{ lotId: 'buy-2', quantity: 2 }],
    });
    expect(replaySealedLedger([buyOne, buyTwo, sale]).sales[0].costCents).toBe(4_000);

    expect(() => replaySealedLedger([
      buyOne,
      transaction('bad-sale', {
        kind: 'sell',
        date: '2026-09-10',
        quantity: 2,
        unitPriceCents: 2_000,
        discountCents: 0,
        allocationMethod: 'manual',
        selections: [{ lotId: 'buy-1', quantity: 1 }],
      }),
    ])).toThrow(SealedDomainError);
  });

  it('rejects future transactions, invalid amounts and sell discounts', () => {
    expect(() => validateSealedTransactionDraft(draft({ date: '2026-09-11' }), now)).toThrow(SealedDomainError);
    expect(() => validateSealedTransactionDraft(draft({ quantity: 0 }), now)).toThrow(SealedDomainError);
    expect(() => validateSealedTransactionDraft(draft({ kind: 'sell', discountCents: 1 }), now)).toThrow(SealedDomainError);
  });

  it('ignores voided transactions and replays through a historical date', () => {
    const voided = transaction('voided', { quantity: 4 });
    voided.voided = true;
    const active = transaction('active', { date: '2026-09-04', quantity: 1 });
    expect(replaySealedLedger([voided, active]).positions[0].quantity).toBe(1);
    expect(replaySealedLedger([voided, active], '2026-09-03').positions).toHaveLength(0);
  });
});

describe('sealed exchanges', () => {
  it('moves one unit and its historical cost without creating a sale or cashflow', () => {
    const buy = transaction('buy-give', {
      cardmarketProductId: 100,
      quantity: 1,
      unitPriceCents: 1_000,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
    });
    const exchange = exchangeTransaction('exchange-1');

    const result = replaySealedLedger([buy, exchange]);

    expect(result.sales).toEqual([]);
    expect(result.exchanges[0]).toMatchObject({
      transaction: { id: 'exchange-1' },
      costCents: 1_000,
    });
    expect(result.positions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        cardmarketProductId: 100,
        quantity: 0,
        costCents: 0,
        exchangeOut: 1,
      }),
      expect.objectContaining({
        cardmarketProductId: 200,
        quantity: 1,
        costCents: 1_000,
        exchangeIn: 1,
      }),
    ]));
    expect(calculateSealedCashflow(
      [buy, exchange],
      '2026-09-01',
      '2026-09-01',
      'day',
    )).toMatchObject([
      expect.objectContaining({
        buysCents: 1_000,
        netSalesCents: 0,
        recoveredCents: 0,
        netCents: -1_000,
      }),
    ]);
  });

  it('transfers the total source cost across different quantities', () => {
    const buy = transaction('buy-three', {
      cardmarketProductId: 100,
      quantity: 3,
      unitPriceCents: 1_000,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
    });
    const exchange = exchangeTransaction('exchange-three-for-two', {
      date: '2026-09-02',
      quantity: 2,
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 3 },
    });

    const result = replaySealedLedger([buy, exchange]);

    expect(result.exchanges[0].costCents).toBe(3_000);
    expect(result.positions).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardmarketProductId: 100, quantity: 0, costCents: 0 }),
      expect.objectContaining({ cardmarketProductId: 200, quantity: 2, costCents: 3_000 }),
    ]));
  });

  it('adds transferred cost to an existing destination position and keeps direct buys distinct', () => {
    const source = transaction('buy-source', {
      cardmarketProductId: 100,
      quantity: 1,
      unitPriceCents: 1_000,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
    });
    const destination = transaction('buy-destination', {
      cardmarketProductId: 200,
      quantity: 1,
      unitPriceCents: 500,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
    });
    const exchange = exchangeTransaction('exchange-existing-destination', {
      date: '2026-09-02',
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
    });

    const destinationPosition = replaySealedLedger([source, destination, exchange]).positions
      .find((position) => position.cardmarketProductId === 200);

    expect(destinationPosition).toMatchObject({
      quantity: 2,
      costCents: 1_500,
      bought: 1,
      exchangeIn: 1,
    });
  });

  it('creates a costed position for a destination that has no direct purchase', () => {
    const source = transaction('buy-source-only', {
      cardmarketProductId: 100,
      quantity: 1,
      unitPriceCents: 1_000,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
    });
    const exchange = exchangeTransaction('exchange-new-destination', {
      date: '2026-09-02',
      cardmarketProductId: 300,
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
    });

    expect(replaySealedLedger([source, exchange]).positions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        cardmarketProductId: 300,
        quantity: 1,
        costCents: 1_000,
        bought: 0,
        exchangeIn: 1,
      }),
    ]));
  });

  it('rejects invalid exchange legs, money fields and allocations', () => {
    const source = transaction('buy-validation-source', {
      cardmarketProductId: 100,
      quantity: 1,
      unitPriceCents: 1_000,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
    });

    expect(() => replaySealedLedger([source, exchangeTransaction('too-much', {
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 2 },
    })])).toThrow(SealedDomainError);
    expect(() => replaySealedLedger([source, exchangeTransaction('zero-receive', { quantity: 0 })])).toThrow(SealedDomainError);
    expect(() => replaySealedLedger([source, exchangeTransaction('negative-give', {
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: -1 },
    })])).toThrow(SealedDomainError);
    expect(() => replaySealedLedger([source, exchangeTransaction('money', { unitPriceCents: 1 })])).toThrow(SealedDomainError);

    const missingGive = exchangeTransaction('missing-give');
    delete (missingGive as unknown as { exchangeGive?: unknown }).exchangeGive;
    expect(() => replaySealedLedger([source, missingGive])).toThrow(SealedDomainError);

    expect(() => replaySealedLedger([source, exchangeTransaction('wrong-lot', {
      allocationMethod: 'manual',
      selections: [{ lotId: 'not-source', quantity: 1 }],
    })])).toThrow(SealedDomainError);

    expect(() => validateSealedTransactionDraft(
      exchangeTransaction('future-exchange', { date: '2026-09-11' }),
      now,
    )).toThrow(SealedDomainError);
  });

  it('keeps different exchange languages in separate positions and allows a same-day sale', () => {
    const source = transaction('buy-fr-source', {
      cardmarketProductId: 100,
      language: 'fr',
      quantity: 1,
      unitPriceCents: 1_000,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
    });
    const exchange = exchangeTransaction('same-day-exchange', {
      language: 'en',
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
    });
    const sale = transaction('same-day-sale', {
      kind: 'sell',
      cardmarketProductId: 200,
      language: 'en',
      quantity: 1,
      unitPriceCents: 1_500,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
      date: '2026-09-01',
    });

    const result = replaySealedLedger([source, exchange, sale]);

    expect(result.sales).toHaveLength(1);
    expect(result.sales[0].costCents).toBe(1_000);
    expect(result.positions).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardmarketProductId: 100, language: 'fr', exchangeOut: 1 }),
      expect.objectContaining({ cardmarketProductId: 200, language: 'en', exchangeIn: 1, sold: 1 }),
    ]));
  });

  it('does not mutate transactions when replay validation fails', () => {
    const source = transaction('immutable-source', {
      cardmarketProductId: 100,
      quantity: 1,
      unitPriceCents: 1_000,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
    });
    const invalid = exchangeTransaction('immutable-invalid', {
      allocationMethod: 'manual',
      selections: [{ lotId: 'missing', quantity: 1 }],
    });
    const before = JSON.stringify([source, invalid]);

    expect(() => replaySealedLedger([source, invalid])).toThrow(SealedDomainError);
    expect(JSON.stringify([source, invalid])).toBe(before);
  });

  it('keeps exchange cost out of financial totals and applies market valuation to received stock', () => {
    const buy = transaction('accounting-buy', {
      cardmarketProductId: 100,
      quantity: 1,
      unitPriceCents: 1_000,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
    });
    const exchange = exchangeTransaction('accounting-exchange', {
      date: '2026-09-02',
      cardmarketProductId: 200,
    });
    const sale = transaction('accounting-sale', {
      kind: 'sell',
      date: '2026-09-03',
      cardmarketProductId: 200,
      quantity: 1,
      unitPriceCents: 1_500,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
    });
    const products = [product, { ...product, cardmarketProductId: 200, name: 'Received test' }];
    const prices = [snapshotForProduct(100, '2026-09-03', 1_200), snapshotForProduct(200, '2026-09-03', 2_000)];
    const receivedSummary = summarizeSealedPortfolio([buy, exchange], products, prices, '2026-09-03');
    const summary = summarizeSealedPortfolio([buy, exchange, sale], products, prices, '2026-09-03');

    expect(receivedSummary.positions.find((position) => position.cardmarketProductId === 200)).toMatchObject({
      costCents: 1_000,
      valueCents: 2_000,
      latentCents: 1_000,
    });
    expect(receivedSummary.totals).toMatchObject({
      spentCents: 1_000,
      grossSalesCents: 0,
      netSalesCents: 0,
      realizedCents: 0,
      cashFlowCents: -1_000,
      soldCostCents: 0,
      exchangeIn: 1,
      exchangeOut: 1,
    });
    expect(summary.totals).toMatchObject({
      spentCents: 1_000,
      grossSalesCents: 1_500,
      netSalesCents: 1_500,
      realizedCents: 500,
      cashFlowCents: 500,
      soldCostCents: 1_000,
      exchangeIn: 1,
      exchangeOut: 1,
    });
    expect(calculateSealedCashflow([buy, exchange, sale], '2026-09-01', '2026-09-03', 'day')
      .map((row) => row.period)).toEqual(['2026-09-01', '2026-09-03']);
  });

  it('replays edited and voided exchanges without retaining the old destination leg', () => {
    const source = transaction('replay-source', {
      cardmarketProductId: 100,
      quantity: 2,
      unitPriceCents: 1_000,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
    });
    const original = exchangeTransaction('replay-exchange', {
      date: '2026-09-02',
      cardmarketProductId: 200,
    });
    const replacement = exchangeTransaction('replay-exchange', {
      date: '2026-09-02',
      cardmarketProductId: 300,
    });
    const edited = replaySealedLedger([source, replacement]);
    const voided = { ...original, voided: true };
    const cancelled = replaySealedLedger([source, voided]);

    expect(edited.positions).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardmarketProductId: 300, quantity: 1, costCents: 1_000 }),
    ]));
    expect(edited.positions).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ cardmarketProductId: 200, quantity: 1 }),
    ]));
    expect(cancelled.positions).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardmarketProductId: 100, quantity: 2, costCents: 2_000 }),
    ]));
    expect(cancelled.positions).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ cardmarketProductId: 200, quantity: 1 }),
    ]));
  });
});

function snapshot(day: string, avg1Cents: number | null, trendCents = avg1Cents): SealedPriceSnapshot {
  return {
    cardmarketProductId: 100,
    day,
    sourceAt: `${day}T06:00:00.000Z`,
    fetchedAt: `${day}T07:00:00.000Z`,
    metrics: {
      avgCents: avg1Cents,
      lowCents: avg1Cents,
      trendCents,
      avg1Cents,
      avg7Cents: avg1Cents,
      avg30Cents: avg1Cents,
    },
  };
}

function snapshotForProduct(productId: number, day: string, avg1Cents: number): SealedPriceSnapshot {
  return { ...snapshot(day, avg1Cents), cardmarketProductId: productId };
}

describe('sealed valuation', () => {
  it('uses the three complete AVG1 days and rounds to cents', () => {
    const result = selectSealedValuation([
      snapshot('2026-09-07', 101),
      snapshot('2026-09-08', 102),
      snapshot('2026-09-09', 103),
    ], '2026-09-10');
    expect(result).toMatchObject({ priceCents: 102, metric: 'app_avg3', day: '2026-09-09', stale: false });
  });

  it('falls back through AVG1, AVG7, Trend, AVG30 and Low', () => {
    const base = snapshot('2026-09-09', null, 777);
    base.metrics.avg7Cents = 555;
    base.metrics.avg30Cents = 333;
    base.metrics.lowCents = 111;
    expect(selectSealedValuation([base], '2026-09-10')).toMatchObject({ priceCents: 555, metric: 'avg7' });
  });

  it('marks a price stale after two days and returns null without a price', () => {
    expect(selectSealedValuation([snapshot('2026-09-01', 100)], '2026-09-10')).toMatchObject({ priceCents: 100, stale: true });
    expect(selectSealedValuation([], '2026-09-10')).toEqual({ priceCents: null, metric: null, day: null, stale: true });
  });
});

const product: SealedProduct = {
  cardmarketProductId: 100,
  name: 'Display test',
  categoryId: 53,
  categoryName: 'Display',
  expansionId: 6569,
  cardmarketUrl: 'https://www.cardmarket.com/fr/Pokemon/Products?idProduct=100',
  imageAvailable: true,
  sourceAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  active: true,
};

describe('sealed analytics', () => {
  it('summarizes market value, latent P/L and cashflow from the replay', () => {
    const transactions = [
      transaction('buy-1', { quantity: 2, unitPriceCents: 1_000, feesCents: 100, shippingCents: 0, discountCents: 0 }),
      transaction('sale-1', { kind: 'sell', date: '2026-09-10', quantity: 1, unitPriceCents: 1_500, feesCents: 0, shippingCents: 0, discountCents: 0 }),
    ];
    const prices = [snapshot('2026-09-10', 1_600)];
    const summary = summarizeSealedPortfolio(transactions, [product], prices, '2026-09-10');
    expect(summary.totals).toMatchObject({ units: 1, costCents: 1_050, valueCents: 1_600, latentCents: 550, realizedCents: 450, totalCents: 1_000 });
    expect(calculateSealedCashflow(transactions, '2026-09-01', '2026-09-10', 'day')).toHaveLength(2);
    expect(calculateSealedCashflow(transactions, '2026-01-01', '2026-09-10', 'month')).toHaveLength(1);
  });
});
