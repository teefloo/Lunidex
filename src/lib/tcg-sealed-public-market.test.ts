import { describe, expect, it } from 'vitest';
import type { SealedPriceSnapshot } from '@primedex/core/types/sealed';
import { buildPublicPriceChartPoints, parsePublicMarketFilters, publicExpansionName, publicMarketContactHref, publicMarketHref, summarizePublicPrice } from './tcg-sealed-public-market';

function price(day: string, trendCents: number | null): SealedPriceSnapshot {
  return { cardmarketProductId: 1, day, sourceAt: day, fetchedAt: day, metrics: { trendCents, avgCents: null, lowCents: null, avg1Cents: null, avg7Cents: null, avg30Cents: null } };
}

describe('public sealed market filters', () => {
  it('bounds and validates URL input', () => {
    const filters = parsePublicMarketFilters(new URLSearchParams({ q: '  Booster  ', page: '99999', category: '53', expansion: '6569' }));
    expect(filters).toEqual({ q: 'Booster', page: 10_000, category: 53, expansion: 6569 });
    expect(publicMarketHref(filters)).toBe('/tcg/sealed/market?q=Booster&page=10000&category=53&expansion=6569');
    expect(parsePublicMarketFilters(new URLSearchParams({ page: '-1', category: '999', expansion: '1 OR 1' }))).toEqual({ q: '', page: 0 });
    expect(parsePublicMarketFilters(new URLSearchParams({ expansion: '0' }))).toEqual({ q: '', page: 0, expansion: 0 });
    expect(publicMarketHref({ q: '', page: 0, expansion: 0 })).toBe('/tcg/sealed/market?expansion=0');
  });

  it('bounds a contextual contact link to a locale and numeric Cardmarket ID', () => {
    expect(publicMarketContactHref('fr', 1234)).toBe('/fr/contact?topic=sealed-market&productId=1234');
    expect(publicMarketContactHref('fr', Number.MAX_SAFE_INTEGER)).toBe('/fr/contact?topic=sealed-market');
    expect(publicMarketContactHref('../x', -1)).toBe('/en/contact?topic=sealed-market');
  });

  it('uses reviewed Cardmarket expansion labels in French and English and preserves unknown source IDs', () => {
    expect(publicExpansionName(5546, 'fr')).toBe('Destinées de Paldea');
    expect(publicExpansionName(5546, 'en')).toBe('Paldean Fates');
    expect(publicExpansionName(5691, 'fr')).toBe('Mascarade Crépusculaire');
    expect(publicExpansionName(6096, 'fr')).toBe('Rivalités Destinées');
    expect(publicExpansionName(6569, 'fr')).toBe('Nuit Noire');
    expect(publicExpansionName(6601, 'fr')).toBe('30ᵉ Anniversaire');
    expect(publicExpansionName(123456, 'en')).toBe('#123456');
  });
});

describe('public price changes', () => {
  it('compares only recent and valid historical trend snapshots', () => {
    expect(summarizePublicPrice([price('2026-09-29', 1500), price('2026-09-22', 1000), price('2026-08-30', 1200)], '2026-09-29'))
      .toEqual({ currentCents: 1500, day: '2026-09-29', sourceAt: '2026-09-29', sevenDayPercent: 50, thirtyDayPercent: 25 });
    expect(summarizePublicPrice([price('2026-09-29', 1500), price('2026-09-10', 1000)], '2026-09-29').sevenDayPercent).toBeNull();
    expect(summarizePublicPrice([price('2026-09-20', 1500)], '2026-09-29').currentCents).toBeNull();
    const staleSource = { ...price('2026-09-29', 1500), sourceAt: '2026-09-20T06:00:00.000Z' };
    expect(summarizePublicPrice([staleSource], '2026-09-29').currentCents).toBeNull();
  });

  it('selects the latest source observation when multiple quotes share a source date', () => {
    const earlier = { ...price('2026-09-29', 1500), sourceAt: '2026-09-29T06:00:00.000Z' };
    const later = { ...price('2026-09-29', 1700), sourceAt: '2026-09-29T16:00:00.000Z' };
    expect(summarizePublicPrice([earlier, later], '2026-09-29').currentCents).toBe(1700);
  });
});


describe('public source-date chart points', () => {
  it('keeps only actual observations and spaces them by their source timestamps', () => {
    const points = buildPublicPriceChartPoints([
      { ...price('2026-09-01', 1000), sourceAt: '2026-09-01T06:00:00.000Z' },
      { ...price('2026-09-03', 2000), sourceAt: '2026-09-03T06:00:00.000Z' },
      { ...price('2026-09-11', 1500), sourceAt: '2026-09-11T06:00:00.000Z' },
    ]);
    expect(points).toHaveLength(3);
    expect(points.map(({ x }) => x)).toEqual([0, 20, 100]);
    expect(points.map(({ sourceAt }) => sourceAt)).toEqual([
      '2026-09-01T06:00:00.000Z', '2026-09-03T06:00:00.000Z', '2026-09-11T06:00:00.000Z',
    ]);
  });
});
