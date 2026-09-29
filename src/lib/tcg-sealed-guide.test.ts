import { describe, expect, it } from 'vitest';
import { buildGuideIndex, buildProductMovers, buildSeriesMovers, seedLaunchBasket } from './tcg-sealed-guide';

const asOf = '2026-09-28';
const observation = (productId: number, day: string, trendCents: number | null) => ({
  productId, day, sourceAt: `${day}T06:00:00.000Z`, trendCents,
});
const products = Array.from({ length: 25 }, (_, offset) => ({
  id: offset + 1, name: `Product ${offset + 1}`, expansionId: 6569, active: true,
}));
const baseline = { version: 'launch-v1', day: '2026-09-20', sourceAt: '2026-09-20T06:00:00.000Z',
  items: products.map((product) => ({ productId: product.id, trendCents: 1000 })),
} as const;

describe('fixed Cardmarket guide basket', () => {
  it('seeds a sorted basket only with active products having a positive trend price', () => {
    const reversed = [...products].reverse();
    const snapshots = reversed.map((product) => ({ ...observation(product.id, '2026-09-29', product.id === 25 ? 0 : 1000), sourceAt: '2026-09-20T06:00:00.000Z' }));
    expect(seedLaunchBasket(reversed, snapshots)).toBeNull();
    snapshots[0] = observation(25, '2026-09-20', 1000);
    const seeded = seedLaunchBasket(reversed, snapshots);
    expect(seeded).toMatchObject({ version: 'launch-v1', day: '2026-09-20', sourceAt: '2026-09-20T06:00:00.000Z' });
    expect(seeded?.items).toHaveLength(25);
    expect(seeded?.items[0]).toEqual({ productId: 1, trendCents: 1000 });
  });

  it('uses equal-weight relative returns against the fixed baseline, starting at 100', () => {
    const observations = products.flatMap((product) => [
      { ...observation(product.id, '2026-09-29', 1000), sourceAt: baseline.sourceAt },
      observation(product.id, asOf, product.id === 1 ? 2000 : 1000),
    ]);
    expect(buildGuideIndex(observations, baseline, asOf)).toMatchObject({ status: 'available', points: [
      { day: '2026-09-20', value: 100, coverage: 1 },
      { day: asOf, value: 104, coverage: 1 },
    ] });
  });

  it('uses only observed days and requires 80 percent comparable coverage', () => {
    const observations = products.slice(0, 20).map((product) => observation(product.id, asOf, 1250));
    expect(buildGuideIndex(observations, baseline, asOf)).toMatchObject({ status: 'available', points: [
      { day: '2026-09-20', value: 100 }, { day: asOf, value: 125, coverage: 0.8 },
    ] });
    expect(buildGuideIndex(observations.slice(0, 19), baseline, asOf)).toMatchObject({ status: 'unavailable', reason: 'insufficient_coverage' });
  });

  it('does not combine disjoint publications from the same day to reach coverage', () => {
    const observations = [
      ...products.slice(0, 10).map((product) => ({ ...observation(product.id, asOf, 1500), sourceAt: `${asOf}T06:00:00.000Z` })),
      ...products.slice(10, 20).map((product) => ({ ...observation(product.id, asOf, 1500), sourceAt: `${asOf}T12:00:00.000Z` })),
    ];

    expect(buildGuideIndex(observations, baseline, asOf)).toMatchObject({ status: 'unavailable', reason: 'insufficient_coverage' });
  });

  it('uses the latest same-day publication that independently meets coverage', () => {
    const observations = [
      ...products.slice(0, 20).map((product) => ({ ...observation(product.id, asOf, 1100), sourceAt: `${asOf}T06:00:00.000Z` })),
      ...products.slice(20).map((product) => ({ ...observation(product.id, asOf, 1600), sourceAt: `${asOf}T12:00:00.000Z` })),
    ];

    expect(buildGuideIndex(observations, baseline, asOf)).toMatchObject({ status: 'available', points: [
      { day: '2026-09-20', value: 100 },
      { day: asOf, sourceAt: `${asOf}T06:00:00.000Z`, value: 110, coverage: 0.8 },
    ] });
  });

  it('returns unavailable for stale source data', () => {
    const observations = products.map((product) => observation(product.id, '2026-09-21', 1100));
    expect(buildGuideIndex(observations, baseline, asOf)).toMatchObject({ status: 'unavailable', reason: 'stale' });
  });
});

describe('Cardmarket movers', () => {
  it('compares immediately preceding actual observations and reports their dates', () => {
    const observations = [
      observation(1, '2026-09-18', 1000), observation(1, '2026-09-26', 1500), observation(1, asOf, 2000),
      observation(2, '2026-09-24', 2000), observation(2, asOf, 1000),
      observation(3, '2026-09-20', 500), observation(3, '2026-09-24', 0), observation(3, asOf, 1000),
    ];
    expect(buildProductMovers(products, observations, asOf)).toMatchObject({ status: 'available', movers: [
      { productId: 2, changePercent: -50, fromDay: '2026-09-24', toDay: asOf, elapsedDays: 4 },
      { productId: 1, changePercent: 33.33333333333333, fromDay: '2026-09-26', toDay: asOf, elapsedDays: 2 },
    ] });
  });

  it('aggregates only curated expansion IDs with 80 percent paired coverage', () => {
    const observations = products.slice(0, 20).flatMap((product) => [
      observation(product.id, '2026-09-27', 1000), observation(product.id, asOf, 1250),
    ]);
    expect(buildSeriesMovers(products, observations, asOf, [{ expansionId: 6569, name: 'Pitch Black' }])).toMatchObject({
      status: 'available', movers: [{ expansionId: 6569, changePercent: 25, coverage: 0.8 }],
    });
    expect(buildSeriesMovers(products, observations, asOf, [])).toMatchObject({ status: 'unavailable' });
    expect(buildSeriesMovers(products, observations.slice(0, -2), asOf, [{ expansionId: 6569, name: 'Pitch Black' }])).toMatchObject({ status: 'unavailable' });
  });
});
