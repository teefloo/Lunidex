import { describe, expect, it } from 'vitest';
import type { SealedPortfolioPoint, SealedPortfolioTotals } from '@primedex/core';
import { mergeSealedPortfolioHistory, parseSealedPortfolioDailyPoint } from './tcg-sealed-history';

const emptyTotals: SealedPortfolioTotals = {
  units: 0,
  costCents: 0,
  valueCents: 0,
  latentCents: 0,
  realizedCents: 0,
  totalCents: 0,
  spentCents: 0,
  grossSalesCents: 0,
  netSalesCents: 0,
  buyFeesCents: 0,
  sellFeesCents: 0,
  bought: 0,
  sold: 0,
  exchangeIn: 0,
  exchangeOut: 0,
  distinct: 0,
  missingPrices: 0,
  roi: null,
  cashFlowCents: 0,
  soldCostCents: 0,
  averageEntryCents: null,
  averageExitCents: null,
  holdingDays: null,
  winningSales: null,
  losingSales: null,
  profitPerSoldUnitCents: null,
  sellThrough: null,
};

const point = (day: string, overrides: Partial<SealedPortfolioTotals> = {}): SealedPortfolioPoint => ({
  day,
  ...emptyTotals,
  ...overrides,
});

describe('sealed portfolio daily history', () => {
  it('accepts an empty point and preserves an unavailable valuation', () => {
    const source = point('2026-09-20', { valueCents: null, latentCents: null, totalCents: null, missingPrices: 1 });

    expect(parseSealedPortfolioDailyPoint({ day: source.day, data: source })).toEqual(source);
  });

  it('ignores malformed or partial rows', () => {
    const source = point('2026-09-20');

    expect(parseSealedPortfolioDailyPoint({ day: source.day, data: { ...source, units: 'bad' } })).toBeNull();
    expect(parseSealedPortfolioDailyPoint({ day: source.day, data: { day: source.day } })).toBeNull();
  });

  it('filters the range and lets current computed points replace cached points', () => {
    const cached = [
      point('2026-09-18', { valueCents: 1_800 }),
      point('2026-09-19', { valueCents: 1_900 }),
      point('2026-09-20', { valueCents: 1_950 }),
    ];
    const computed = [point('2026-09-19', { valueCents: 2_000 })];

    expect(mergeSealedPortfolioHistory(cached, computed, '2026-09-19', '2026-09-20')).toEqual([
      point('2026-09-19', { valueCents: 2_000 }),
      point('2026-09-20', { valueCents: 1_950 }),
    ]);
  });

  it('caps long histories while retaining the first and latest day', () => {
    const points = Array.from({ length: 367 }, (_, index) => point(new Date(Date.UTC(2025, 0, index + 1)).toISOString().slice(0, 10)));
    const result = mergeSealedPortfolioHistory(points, [], '2025-01-01', '2026-01-02');

    expect(result.length).toBeLessThanOrEqual(366);
    expect(result.length).toBeGreaterThan(1);
    expect(result[0]?.day).toBe(points[0]?.day);
    expect(result.at(-1)?.day).toBe(points.at(-1)?.day);
  });
});
