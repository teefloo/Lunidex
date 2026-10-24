import { describe, expect, it } from 'vitest';
import { parseSharedPokemonIds } from './shared-pokemon-ids';

describe('shared Pokémon selections', () => {
  it('deduplicates before applying the comparison limit', () => {
    expect(parseSharedPokemonIds('25,25,6,133', 3)).toEqual([25, 6, 133]);
  });
  it('accepts team codes and rejects partial, fractional and unsafe IDs', () => {
    expect(parseSharedPokemonIds('25-6-9', 6)).toEqual([25, 6, 9]);
    expect(parseSharedPokemonIds('25oops,1.5,0,9007199254740993,133', 3)).toEqual([133]);
    expect(parseSharedPokemonIds(null, 6)).toEqual([]);
    expect(parseSharedPokemonIds('-25,6', 3)).toEqual([6]);
    expect(parseSharedPokemonIds('-25', 3)).toEqual([]);
  });

  it('uses shareable URL state for anonymous Pokémon comparisons', async () => {
    const helpers = await import('./shared-pokemon-ids');
    const shouldUseSharedState = Reflect.get(helpers, 'shouldUseSharedPokemonCompare');

    expect(typeof shouldUseSharedState).toBe('function');
    if (typeof shouldUseSharedState === 'function') {
      expect(shouldUseSharedState(false, false)).toBe(true);
      expect(shouldUseSharedState(true, false)).toBe(false);
      expect(shouldUseSharedState(true, true)).toBe(true);
    }
  });
});
