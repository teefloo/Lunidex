import { describe, expect, it } from 'vitest';
import { calculateExpectedValue, calculatePullRates, validateOpeningSample, validatePriceSnapshot } from './tcg-booster-evidence';

const sample = {
  version: 1,
  source: { name: 'Observed openings', url: 'https://example.com/openings' },
  setId: 'sv01', region: 'EU', boosterType: 'standard',
  period: { from: '2026-09-01', to: '2026-09-15' },
  packCount: 100, cardsPerPack: 2,
  rarityCounts: [{ rarity: 'common', count: 150 }, { rarity: 'rare', count: 50 }],
  outcomes: [
    { cardId: 'sv01-1', variant: 'normal', rarity: 'common', count: 150 },
    { cardId: 'sv01-2', variant: 'holo', rarity: 'rare', count: 50 },
  ],
} as const;

const prices = {
  version: 1, source: 'Cardmarket', currency: 'EUR', region: 'EU', setId: 'sv01', boosterType: 'standard',
  observedAt: '2026-09-16', packPriceEur: 5, packPriceUrl: 'https://www.cardmarket.com/en/Pokemon',
  quotes: [
    { cardId: 'sv01-1', variant: 'normal', priceEur: 0.1, url: 'https://www.cardmarket.com/en/Pokemon' },
    { cardId: 'sv01-2', variant: 'holo', priceEur: 3, url: 'https://www.cardmarket.com/en/Pokemon' },
  ],
} as const;

describe('versioned booster evidence', () => {
  it('rejects unsupported versions, incomplete source and malformed dates', () => {
    expect(validateOpeningSample({ ...sample, version: 2 })).toBeNull();
    expect(validateOpeningSample({ ...sample, source: { name: '', url: '' } })).toBeNull();
    expect(validateOpeningSample({ ...sample, period: { from: '2026-09-31', to: '2026-09-15' } })).toBeNull();
    expect(validateOpeningSample({ ...sample, period: { from: '2026-09-16', to: '2026-09-15' } })).toBeNull();
    expect(validateOpeningSample({ ...sample, region: '' })).toBeNull();
    expect(calculatePullRates({ ...sample, packCount: 0 })).toBeNull();
    expect(validateOpeningSample({ ...sample, boosterType: '' })).toBeNull();
  });

  it('rejects inconsistent pack and rarity counts', () => {
    expect(validateOpeningSample({ ...sample, packCount: 0 })).toBeNull();
    expect(validateOpeningSample({ ...sample, rarityCounts: [{ rarity: 'rare', count: 51 }] })).toBeNull();
    expect(validateOpeningSample({ ...sample, outcomes: sample.outcomes.slice(0, 1) })).toBeNull();
    expect(validateOpeningSample({ ...sample, rarityCounts: [{ rarity: 'rare', count: 50 }, { rarity: 'rare', count: 150 }] })).toBeNull();
  });

  it('calculates rarity occurrence per pack from a validated sample', () => {
    const valid = validateOpeningSample(sample);
    expect(valid).not.toBeNull();
    expect(calculatePullRates(valid!)).toEqual([
      { rarity: 'common', expectedCopiesPerPack: 1.5, observedCount: 150, packCount: 100 },
      { rarity: 'rare', expectedCopiesPerPack: 0.5, observedCount: 50, packCount: 100 },
    ]);
  });

  it('requires matched EUR Cardmarket quotes for every card variant', () => {
    const valid = validateOpeningSample(sample)!;
    expect(validatePriceSnapshot({ ...prices, currency: 'USD' })).toBeNull();
    expect(validatePriceSnapshot({ ...prices, source: 'Other' })).toBeNull();
    expect(validatePriceSnapshot({ ...prices, packPriceUrl: 'https://example.com/pack' })).toBeNull();
    expect(validatePriceSnapshot({ ...prices, quotes: [{ ...prices.quotes[0], url: 'https://example.com/card' }, prices.quotes[1]] })).toBeNull();
    expect(calculateExpectedValue(valid, validatePriceSnapshot({ ...prices, region: 'US' }))).toBeNull();
    expect(calculateExpectedValue(valid, validatePriceSnapshot({ ...prices, quotes: prices.quotes.slice(0, 1) }))).toBeNull();
    expect(calculateExpectedValue(valid, validatePriceSnapshot({ ...prices, quotes: [{ ...prices.quotes[0], variant: 'holo' }, prices.quotes[1]] }))).toBeNull();
  });

  it('returns a gross estimate and cost difference only with full coverage', () => {
    const result = calculateExpectedValue(validateOpeningSample(sample)!, validatePriceSnapshot(prices));
    expect(result).toEqual({ grossCardValueEur: 1.65, packPriceEur: 5, differenceEur: -3.35, pricedOutcomes: 2, observedOutcomes: 2, packCount: 100 });
    expect(calculateExpectedValue(null, validatePriceSnapshot(prices))).toBeNull();
    expect(calculateExpectedValue({ ...sample, packCount: 0 }, prices)).toBeNull();
  });
});
