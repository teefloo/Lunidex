import { describe, expect, it } from 'vitest';
import type { TCGCard } from '@/types/tcg';
import { getQualifiedCardmarketObservations } from './tcg-qualified-price-history';

const card: TCGCard = {
  id: 'base1-4',
  localId: '4',
  name: 'Charizard',
  set: { id: 'base1', name: 'Base Set' },
  variants: { normal: true, holo: true, reverse: true },
  pricing: {
    cardmarket: {
      unit: 'EUR',
      updated: '2026-11-06T13:00:00.000Z',
      idProduct: 1234,
      trend: 0.25,
      'trend-holo': 125.5,
      // Deliberately no reverse trend: it must never fall back to holo.
    },
  },
};

const invalidCards: TCGCard[] = [
  { ...card, variants: { normal: false, holo: false, reverse: false } },
  { ...card, set: undefined },
  { ...card, pricing: { cardmarket: { ...card.pricing?.cardmarket, unit: 'USD' } } },
  { ...card, pricing: { cardmarket: { ...card.pricing?.cardmarket, updated: 'invalid' } } },
  { ...card, pricing: { cardmarket: { ...card.pricing?.cardmarket, updated: '2026-09-01T00:00:00.000Z' } } },
];

describe('qualified Cardmarket observations', () => {
  it('uses only exact available trend metrics for variants the card actually has', () => {
    const rows = getQualifiedCardmarketObservations(card, 'fr', new Date('2026-11-06T14:00:00.000Z'));

    expect(rows).toEqual([
      expect.objectContaining({ cardId: 'base1-4', setId: 'base1', cardLanguage: 'fr', variant: 'normal', metric: 'trend', currency: 'EUR', value: 0.25, sourceObservedAt: '2026-11-06T13:00:00.000Z' }),
      expect.objectContaining({ cardId: 'base1-4', setId: 'base1', cardLanguage: 'fr', variant: 'holo', metric: 'trend', currency: 'EUR', value: 125.5, sourceObservedAt: '2026-11-06T13:00:00.000Z' }),
    ]);
  });

  it.each(invalidCards)('rejects invalid or incomparable source details', (candidate) => {
    expect(getQualifiedCardmarketObservations(candidate, 'fr', new Date('2026-11-06T14:00:00.000Z'))).toEqual([]);
  });
});
