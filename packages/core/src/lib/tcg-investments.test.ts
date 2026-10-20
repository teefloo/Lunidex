import { describe, expect, it } from 'vitest';
import { normalizeTCGInvestment, normalizeTCGInvestments, summarizeTCGInvestments, valueTCGInvestment } from './tcg-investments';

export const purchase = {
  id: '126e8648-39da-4fc9-88b2-fd194d28cc5a', cardId: 'base1-1', cardName: 'Alakazam',
  setId: 'base1', language: 'fr', variant: 'holo', printing: '', condition: 'nm',
  quantity: 1, unitCostCents: 2000, feesCents: 0, acquiredOn: null,
  valuation: { unitPriceCents: 3500, valuedOn: '2026-10-19' },
  createdAt: '2026-10-19T10:00:00.000Z', updatedAt: '2026-10-19T10:00:00.000Z',
};

describe('card investments', () => {
  it('computes the requested 20 to 35 euro example', () => {
    const lot = normalizeTCGInvestment(purchase)!;
    expect(valueTCGInvestment(lot)).toMatchObject({ investedCents: 2000, valueCents: 3500, gainCents: 1500, returnPercent: 75 });
  });
  it('weights separate purchases and fees, excluding unvalued capital from returns', () => {
    const first = normalizeTCGInvestment({ ...purchase, quantity: 2, feesCents: 500 })!;
    const second = normalizeTCGInvestment({ ...purchase, id: '226e8648-39da-4fc9-88b2-fd194d28cc5a', unitCostCents: 4000 })!;
    const missing = normalizeTCGInvestment({ ...purchase, id: '326e8648-39da-4fc9-88b2-fd194d28cc5a', valuation: null })!;
    expect(summarizeTCGInvestments([first, second, missing])).toMatchObject({ investedCents: 10500, valuedCostCents: 8500, valueCents: 10500, gainCents: 2000, unvaluedCostCents: 2000, unvaluedQuantity: 1, quantity: 4 });
    expect(summarizeTCGInvestments([first, second, missing]).returnPercent).toBeCloseTo(2000 / 8500 * 100);
  });
  it('keeps absent values distinct from zero and undefined returns', () => {
    const free = normalizeTCGInvestment({ ...purchase, unitCostCents: 0, valuation: { unitPriceCents: 0, valuedOn: null } })!;
    expect(valueTCGInvestment(free)).toMatchObject({ valueCents: 0, gainCents: 0, returnPercent: null });
    expect(valueTCGInvestment({ ...free, valuation: null })).toMatchObject({ valueCents: null, gainCents: null });
    expect(summarizeTCGInvestments([])).toMatchObject({ returnPercent: null, gainCents: null, valueCents: null });
  });
  it.each([
    { quantity: 0 }, { quantity: 1.5 }, { unitCostCents: -1 }, { feesCents: Infinity },
    { unitCostCents: 1.25 }, { acquiredOn: '2026-02-30' }, { language: 'xx' },
    { variant: 'made-up' }, { variant: 'other', printing: '' }, { condition: 'bad' },
    { valuation: { unitPriceCents: -1, valuedOn: null } }, { id: '__proto__' },
  ])('rejects invalid boundary data %j', (patch) => {
    expect(normalizeTCGInvestment({ ...purchase, ...patch })).toBeNull();
  });
  it('rejects duplicates without collapsing legitimate acquisitions', () => {
    expect(normalizeTCGInvestments([purchase, purchase])).toBeNull();
    expect(normalizeTCGInvestments([purchase, { ...purchase, id: '226e8648-39da-4fc9-88b2-fd194d28cc5a' }])).toHaveLength(2);
    expect(normalizeTCGInvestment({ ...purchase, remotePayload: { anything: true } })).not.toHaveProperty('remotePayload');
  });
});
