import { describe, expect, it } from 'vitest';
import {
  hasInvalidSharedPokemonIds,
  parseSharedPokemonIds,
  shouldUseSharedPokemonCompare,
} from './shared-pokemon-ids';

describe('shared Pokémon comparison links', () => {
  it('treats an absent selection as a normal empty comparison', () => {
    expect(hasInvalidSharedPokemonIds(null)).toBe(false);
    expect(parseSharedPokemonIds(null, 3)).toEqual([]);
  });

  it('rejects explicitly malformed IDs without accepting a valid subset', () => {
    expect(hasInvalidSharedPokemonIds('')).toBe(true);
    expect(hasInvalidSharedPokemonIds('1,nope')).toBe(true);
    expect(hasInvalidSharedPokemonIds('0')).toBe(true);
    expect(hasInvalidSharedPokemonIds('1,2,3,4')).toBe(true);
  });

  it('accepts supported comma and hyphen encodings', () => {
    expect(hasInvalidSharedPokemonIds('25,1,4')).toBe(false);
    expect(hasInvalidSharedPokemonIds('25-1-4')).toBe(false);
    expect(parseSharedPokemonIds('25,1,4', 3)).toEqual([25, 1, 4]);
  });

  it('preserves the parser dedupe, partial-filter, and slot-limit behavior', () => {
    expect(parseSharedPokemonIds('25,25,6,133', 3)).toEqual([25, 6, 133]);
    expect(parseSharedPokemonIds('25-6-9', 6)).toEqual([25, 6, 9]);
    expect(parseSharedPokemonIds('25oops,1.5,0,9007199254740993,133', 3)).toEqual([133]);
    expect(parseSharedPokemonIds('-25,6', 3)).toEqual([6]);
    expect(parseSharedPokemonIds('-25', 3)).toEqual([]);
  });

  it('uses shareable URL state for anonymous Pokémon comparisons', () => {
    expect(shouldUseSharedPokemonCompare(false, false)).toBe(true);
    expect(shouldUseSharedPokemonCompare(true, false)).toBe(false);
    expect(shouldUseSharedPokemonCompare(true, true)).toBe(true);
  });

  it('deduplicates valid IDs before enforcing the three-slot limit', () => {
    expect(hasInvalidSharedPokemonIds('25,25,1,1,4,4')).toBe(false);
    expect(hasInvalidSharedPokemonIds('25-25-1-1-4-4')).toBe(false);
    expect(hasInvalidSharedPokemonIds('25,25,1,1,4,4,8')).toBe(true);
    expect(hasInvalidSharedPokemonIds('25,25,1,nope')).toBe(true);
  });
});
