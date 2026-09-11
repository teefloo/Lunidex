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
