import { describe, expect, it } from 'vitest';
import { normalizeSealedDraft, SealedServerError, sealedExportCsv } from './tcg-sealed-server';

describe('sealed exchange server boundary', () => {
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
