import { describe, expect, it } from 'vitest';
import type { SealedPriceSnapshot, SealedProduct, SealedTransaction } from '@primedex/core';
import { normalizeSealedDraft, SealedServerError, sealedExportCsv, summarizeSealedProductDetail } from './tcg-sealed-server';

const detailProduct = (cardmarketProductId: number, name: string): SealedProduct => ({
  cardmarketProductId,
  name,
  categoryId: 53,
  categoryName: 'Display',
  expansionId: 1,
  cardmarketUrl: `https://example.test/${cardmarketProductId}`,
  imageAvailable: false,
  sourceAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  active: true,
});

const detailTransaction = (overrides: Partial<SealedTransaction>): SealedTransaction => ({
  id: 'detail-transaction',
  revision: 1,
  kind: 'buy',
  cardmarketProductId: 100,
  language: 'fr',
  date: '2026-09-01',
  quantity: 1,
  unitPriceCents: 1_000,
  feesCents: 0,
  shippingCents: 0,
  discountCents: 0,
  paymentFeesCents: 0,
  otherCostsCents: 0,
  platform: '',
  counterparty: '',
  notes: '',
  storage: '',
  allocationMethod: 'fifo',
  selections: [],
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  voided: false,
  ...overrides,
});

const detailPrice = (cardmarketProductId: number): SealedPriceSnapshot => ({
  cardmarketProductId,
  day: '2026-09-02',
  sourceAt: '2026-09-02T06:00:00.000Z',
  fetchedAt: '2026-09-02T07:00:00.000Z',
  metrics: {
    avgCents: 2_000,
    lowCents: 2_000,
    trendCents: 2_000,
    avg1Cents: 2_000,
    avg7Cents: 2_000,
    avg30Cents: 2_000,
  },
});

describe('sealed exchange server boundary', () => {
  it('replays the source purchase when loading a received exchange product detail', () => {
    const buy = detailTransaction({ id: 'source-buy' });
    const exchange = detailTransaction({
      id: 'received-exchange',
      kind: 'exchange',
      cardmarketProductId: 200,
      language: 'en',
      unitPriceCents: 0,
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
    });

    const summary = summarizeSealedProductDetail(
      [buy, exchange],
      [detailProduct(100, 'Given Display'), detailProduct(200, 'Received Display')],
      [detailPrice(200)],
      200,
      '2026-09-02',
    );

    expect(summary.positions).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardmarketProductId: 200, quantity: 1, costCents: 1_000, valueCents: 2_000 }),
    ]));
    expect(summary.positions).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ cardmarketProductId: 100 }),
    ]));
  });

  it('normalizes an exchange with zero monetary fields and default language', () => {
    expect(normalizeSealedDraft({
      kind: 'exchange',
      cardmarketProductId: 200,
      quantity: 1,
      date: '2026-09-10',
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
    })).toMatchObject({
      kind: 'exchange',
      language: 'unknown',
      unitPriceCents: 0,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
      paymentFeesCents: 0,
      otherCostsCents: 0,
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
    });
  });

  it('rejects nonzero exchange money or an incomplete give leg', () => {
    expect(() => normalizeSealedDraft({
      kind: 'exchange',
      cardmarketProductId: 200,
      quantity: 1,
      date: '2026-09-10',
      unitPriceCents: 1,
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
    })).toThrow(SealedServerError);

    expect(() => normalizeSealedDraft({
      kind: 'exchange',
      cardmarketProductId: 200,
      quantity: 1,
      date: '2026-09-10',
    })).toThrow(SealedServerError);
  });
});

describe('sealed exchange export', () => {
  it('exports received and given product details without removing existing columns', () => {
    const exported = {
      transactions: [{
        id: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
        kind: 'exchange',
        cardmarketProductId: 200,
        date: '2026-09-01',
        language: 'en',
        quantity: 1,
        unitPriceCents: 0,
        feesCents: 0,
        shippingCents: 0,
        discountCents: 0,
        paymentFeesCents: 0,
        otherCostsCents: 0,
        allocationMethod: 'fifo',
        voided: false,
        notes: '',
        exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
      }],
    } as Parameters<typeof sealedExportCsv>[0];

    const csv = sealedExportCsv(exported);

    expect(csv).toContain('"id"');
    expect(csv).toContain('"exchange_give_product_id"');
    expect(csv).toContain('"exchange_give_language"');
    expect(csv).toContain('"exchange_give_quantity"');
    expect(csv).toContain('"100","fr","1"');
  });
});
