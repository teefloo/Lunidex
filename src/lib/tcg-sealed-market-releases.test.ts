import { describe, expect, it } from 'vitest';
import {
  formatPublicMarketReleaseDate,
  getPublicMarketExpansionReleaseDateRows,
  getPublicMarketProductReleaseDateRows,
  publicMarketReleaseDateValuesSql,
  resolvePublicMarketReleaseDate,
} from './tcg-sealed-market-releases';

describe('public sealed market release dates', () => {
  it('prefers an exact product date over its expansion date', () => {
    const date = resolvePublicMarketReleaseDate(885540, 6569);
    expect(date).toEqual({ source: 'product', window: { precision: 'day', date: '2026-07-04' } });
    expect(date && formatPublicMarketReleaseDate(date, 'fr')).toBe('4 juillet 2026');
  });

  it('uses a documented expansion date when no exact product date exists', () => {
    const date = resolvePublicMarketReleaseDate(123456, 5402);
    expect(date).toEqual({ source: 'expansion', window: { precision: 'day', date: '2023-09-22' } });
    expect(date && formatPublicMarketReleaseDate(date, 'en')).toBe('September 22, 2023');
  });

  it('leaves undated products unknown and emits only unique reviewed SQL rows', () => {
    expect(resolvePublicMarketReleaseDate(123456, 123456)).toBeNull();
    const productRows = getPublicMarketProductReleaseDateRows();
    const expansionRows = getPublicMarketExpansionReleaseDateRows();
    expect(productRows).toHaveLength(18);
    expect(new Set(productRows.map((row) => row.id)).size).toBe(productRows.length);
    expect(expansionRows).toHaveLength(20);
    expect(new Set(expansionRows.map((row) => row.id)).size).toBe(expansionRows.length);
    expect(expansionRows.find((row) => row.id === 5402)).toEqual({ id: 5402, start: '2023-09-22', end: '2023-09-22' });
    expect(publicMarketReleaseDateValuesSql()).toContain("('expansion', 5402, '2023-09-22'::date, '2023-09-22'::date)");
  });
});
