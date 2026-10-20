import { describe, expect, it } from 'vitest';
import { createInvestmentDraft, getDefaultInvestmentVariant, validateInvestmentDraft } from './tcg-investment-form';
import type { TCGCard } from '@/types/tcg';

const card: TCGCard = { id: 'base1-4', name: 'Dracaufeu', localId: '4', set: { id: 'base1', name: 'Base' }, variants: { holo: true, normal: false, reverse: false } };

describe('investment purchase form', () => {
  it('selects the only standard finish, but never guesses between several finishes', () => {
    expect(getDefaultInvestmentVariant(card)).toBe('holo');
    expect(getDefaultInvestmentVariant({ ...card, variants: { normal: true, reverse: true } })).toBe('');
    expect(getDefaultInvestmentVariant({ ...card, variants: undefined })).toBe('');
  });

  it('records a known catalog card without a price feed or detail response', () => {
    const draft = { ...createInvestmentDraft('fr'), variant: 'holo' as const, unitCost: '20,25', quantity: '2', fees: '5' };
    expect(validateInvestmentDraft(draft, card)).toEqual({ input: {
      cardId: 'base1-4', cardName: 'Dracaufeu', setId: 'base1', language: 'fr', variant: 'holo', printing: '', condition: 'unknown', quantity: 2, unitCostCents: 2025, feesCents: 500, acquiredOn: null, valuation: null,
    }, errors: {} });
  });

  it('identifies each invalid field and requires explicit confirmation for zero estimates too', () => {
    const result = validateInvestmentDraft({ ...createInvestmentDraft('fr'), unitCost: '1,234', quantity: '0', estimate: '0', acquired: '2026-02-30' }, card);
    expect(result.input).toBeNull();
    expect(result.errors).toMatchObject({ unitCost: 'amount', quantity: 'quantity', confirmed: 'confirm', acquired: 'date' });
  });

  it('requires descriptions for special editions and certifications, never for a standard card', () => {
    const draft = { ...createInvestmentDraft('fr'), variant: 'holo' as const, unitCost: '20' };
    expect(validateInvestmentDraft(draft, card).errors).toEqual({});
    expect(validateInvestmentDraft({ ...draft, variant: 'other' }, card).errors.printing).toBe('printing');
    expect(validateInvestmentDraft({ ...draft, condition: 'graded' }, card).errors.printing).toBe('printing');
  });

  it('allows a documented other edition when the catalog has no finish metadata', () => {
    const draft = { ...createInvestmentDraft('fr'), variant: 'other' as const, printing: 'Edition confirmed on my card', unitCost: '20' };
    expect(validateInvestmentDraft(draft, { ...card, variants: undefined }).input?.variant).toBe('other');
  });
});
