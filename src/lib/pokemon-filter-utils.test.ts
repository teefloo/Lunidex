import { describe, expect, it } from 'vitest';
import {
  comparePokemonMeasurements,
  getPokemonSearchFromUrl,
  getExactNumericPokemonId,
  isHeightWithinRange,
  normalizeSearchText,
  needsDetailedPokemonData,
  shouldCommitPokemonSearch,
  shouldShowInitialPokemonListError,
  shouldUseCompletePokemonSummary,
} from './pokemon-filter-utils';

describe('pokemon filter utilities', () => {
  it('uses summaries for measurement filters, sorts, search and collection views', () => {
    expect(needsDetailedPokemonData({})).toBe(false);
    expect(needsDetailedPokemonData({ heightRange: [1, 25], weightRange: [10, 100], sortBy: 'height-asc' })).toBe(false);
    expect(needsDetailedPokemonData({ sortBy: 'weight-desc', searchTerm: '#025', showFavoritesOnly: true })).toBe(false);
  });

  it('requires details for species attributes and every stat threshold', () => {
    for (const filters of [
      { isLegendary: false }, { isMythical: true }, { selectedEggGroups: ['monster'] },
      { selectedColors: ['red'] }, { selectedShapes: ['ball'] }, { minBaseStats: 1 },
      { minAttack: 1 }, { minDefense: 1 }, { minSpeed: 1 }, { minHp: 1 },
    ]) expect(needsDetailedPokemonData(filters)).toBe(true);
    expect(needsDetailedPokemonData({ isLegendary: null, isMythical: null, minAttack: 0 })).toBe(false);
  });

  it('normalizes case and diacritics for user-facing searches', () => {
    expect(normalizeSearchText(' ÉQUILIBRE ')).toBe('equilibre');
    expect(normalizeSearchText('Salamèche')).toBe('salameche');
  });

  it('recognizes exact lookups for padded and hash-prefixed IDs', () => {
    expect(getExactNumericPokemonId('001')).toBe(1);
    expect(getExactNumericPokemonId('#025')).toBe(25);
    expect(getExactNumericPokemonId('25')).toBeNull();
    expect(getExactNumericPokemonId('pikachu')).toBeNull();
  });

  it('commits only a current search value entered by the user', () => {
    expect(shouldCommitPokemonSearch('', null)).toBe(false);
    expect(shouldCommitPokemonSearch('Pikachu', 'Pikachu')).toBe(true);
    expect(shouldCommitPokemonSearch('Pikachu', 'Pika')).toBe(false);
  });

  it('reads the search value restored by browser history navigation', () => {
    expect(getPokemonSearchFromUrl('?q=%23025')).toBe('#025');
    expect(getPokemonSearchFromUrl('?gen=1')).toBe('');
  });

  it('shows a retryable list error only when the initial list has no data', () => {
    expect(shouldShowInitialPokemonListError(true, false, new Error('offline'))).toBe(true);
    expect(shouldShowInitialPokemonListError(true, true, new Error('next page failed'))).toBe(false);
    expect(shouldShowInitialPokemonListError(false, false, new Error('other query failed'))).toBe(false);
    expect(shouldShowInitialPokemonListError(true, false, null)).toBe(false);
  });

  it('keeps unknown measurements after known values in either direction', () => {
    expect(comparePokemonMeasurements(0, 1, 'asc')).toBeGreaterThan(0);
    expect(comparePokemonMeasurements(1, 0, 'desc')).toBeLessThan(0);
    expect(comparePokemonMeasurements(100, 50, 'desc')).toBeLessThan(0);
  });

  it('treats the 25 m slider endpoint as an explicit open-ended height bound', () => {
    expect(isHeightWithinRange(28, 20, 25)).toBe(true);
    expect(isHeightWithinRange(24.9, 20, 24.9)).toBe(true);
    expect(isHeightWithinRange(25.1, 20, 24.9)).toBe(false);
    expect(isHeightWithinRange(19.9, 20, 25)).toBe(false);
    expect(isHeightWithinRange(Number.NaN, 0, 25)).toBe(false);
  });

  it('uses the complete catalogue for caught and favorite views', () => {
    expect(shouldUseCompletePokemonSummary({
      hasOtherFilters: false,
      showCaughtOnly: 'caught',
      showFavoritesOnly: false,
    })).toBe(true);
    expect(shouldUseCompletePokemonSummary({
      hasOtherFilters: false,
      showCaughtOnly: 'all',
      showFavoritesOnly: true,
    })).toBe(true);
    expect(shouldUseCompletePokemonSummary({
      hasOtherFilters: false,
      showCaughtOnly: 'all',
      showFavoritesOnly: false,
    })).toBe(false);
  });
});
