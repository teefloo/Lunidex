import { describe, expect, it } from 'vitest';
import { getInvestmentReferenceQuote, parseEuroCents } from './tcg-investments';
import type { TCGCard } from '@/types/tcg';

const card: TCGCard = { id: 'base1-1', localId: '1', name: 'Alakazam', variants: { normal: true, holo: true, reverse: true }, pricing: { cardmarket: { unit: 'EUR', trend: 20, 'trend-holo': 35 } } };
describe('investment reference quotes', () => {
  it('parses decimal amounts without accepting rounding or locale mistakes', () => {
    expect(parseEuroCents('20,25')).toBe(2025);
    expect(parseEuroCents('0')).toBe(0);
    for (const invalid of ['', '1.234', '1e3', '-1', 'Infinity', '1,234.00']) expect(parseEuroCents(invalid)).toBeNull();
  });
  it('uses existing EUR resolution only for the selected standard finish', () => {
    expect(getInvestmentReferenceQuote(card, 'holo', '')?.amount).toBe(35);
    expect(getInvestmentReferenceQuote(card, 'normal', '')?.amount).toBe(20);
    expect(getInvestmentReferenceQuote(card, 'reverse', '')).toBeNull();
    expect(getInvestmentReferenceQuote(card, 'firstEdition', '')).toBeNull();
    expect(getInvestmentReferenceQuote(card, 'holo', 'PSA 10')).toBeNull();
  });
  it('never substitutes USD, zero sentinels, or another finish for EUR', () => {
    expect(getInvestmentReferenceQuote({ ...card, pricing: { tcgplayer: { unit: 'USD', normal: { marketPrice: 5 } } } }, 'normal', '')).toBeNull();
    expect(getInvestmentReferenceQuote({ ...card, pricing: { cardmarket: { trend: 0 } } }, 'normal', '')).toBeNull();
  });
});
