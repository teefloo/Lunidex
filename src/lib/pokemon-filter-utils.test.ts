import { describe, expect, it } from 'vitest';
import {
  comparePokemonMeasurements,
  getExactNumericPokemonId,
  normalizeSearchText,
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

  it('keeps unknown measurements after known values in either direction', () => {
    expect(comparePokemonMeasurements(0, 1, 'asc')).toBeGreaterThan(0);
    expect(comparePokemonMeasurements(1, 0, 'desc')).toBeLessThan(0);
    expect(comparePokemonMeasurements(100, 50, 'desc')).toBeLessThan(0);
  });
});
