import { describe, expect, it } from 'vitest';
import {
  comparePokemonMeasurements,
  getPokemonSearchFromUrl,
  getExactNumericPokemonId,
  normalizeSearchText,
  shouldCommitPokemonSearch,
  shouldShowInitialPokemonListError,
  shouldUseCompletePokemonSummary,
} from './pokemon-filter-utils';

describe('pokemon filter utilities', () => {
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
