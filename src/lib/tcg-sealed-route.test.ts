import { describe, expect, it } from 'vitest';
import { dateParam, positiveId } from './tcg-sealed-route';
import { getSealedSubnavPath } from './tcg-sealed-navigation';
import { isSealedUuid, normalizeSealedDraft, sealedExportCsv } from './tcg-sealed-server';

describe('sealed route boundaries', () => {
  it('accepts only positive safe product ids and UUID transaction ids', () => {
    expect(positiveId('42')).toBe(42);
    expect(positiveId('0')).toBeNull();
    expect(positiveId('9007199254740992')).toBeNull();
    expect(isSealedUuid('6ba7b810-9dad-41d1-80b4-00c04fd430c8')).toBe(true);
    expect(isSealedUuid('not-a-uuid')).toBe(false);
  });

  it('lets the server validate supplied dates instead of silently changing them', () => {
    expect(dateParam(null, '0000-01-01')).toBe('0000-01-01');
    expect(dateParam('2026-02-31', '0000-01-01')).toBe('2026-02-31');
  });

  it('normalizes safe defaults without accepting an arbitrary payload shape', () => {
    expect(normalizeSealedDraft({
      kind: 'buy',
      cardmarketProductId: 42,
      date: '2026-09-01',
      quantity: 1,
      unitPriceCents: 1_250,
    })).toMatchObject({
      language: 'unknown',
      feesCents: 0,
      allocationMethod: 'fifo',
      selections: [],
    });
    expect(() => normalizeSealedDraft({ kind: 'buy', cardmarketProductId: 42 })).toThrow();
  });
});

describe('sealed navigation', () => {
  it('maps each portfolio view to a direct path and keeps an invalid view safe', () => {
    expect(getSealedSubnavPath('dashboard')).toBe('/tcg/sealed');
    expect(getSealedSubnavPath('collection')).toBe('/tcg/sealed/collection');
    expect(getSealedSubnavPath('analytics')).toBe('/tcg/sealed/analytics');
    expect(getSealedSubnavPath('not-a-view')).toBe('/tcg/sealed');
  });
});

describe('sealed export', () => {
  it('quotes CSV fields and keeps monetary values in EUR', () => {
    const exported = {
      transactions: [{
        id: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
        kind: 'buy',
        cardmarketProductId: 42,
        date: '2026-09-01',
        language: 'fr',
        quantity: 2,
        unitPriceCents: 1_250,
        feesCents: 100,
        shippingCents: 0,
        discountCents: 50,
        paymentFeesCents: 0,
        otherCostsCents: 0,
        allocationMethod: 'fifo',
        voided: false,
        notes: 'Achat, "vérifié"',
      }],
    } as Parameters<typeof sealedExportCsv>[0];
    const csv = sealedExportCsv(exported);
    expect(csv).toContain('"unit_price_eur"');
    expect(csv).toContain('"12.50"');
    expect(csv).toContain('"Achat, ""vérifié"""');
  });
});
