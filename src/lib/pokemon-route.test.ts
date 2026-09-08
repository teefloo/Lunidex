import { describe, expect, it } from 'vitest';

import { isPokemonDetailResponse, normalizePokemonName } from './pokemon-route';

describe('pokemon route input validation', () => {
  it.each([
    ['Pikachu', 'pikachu'],
    ['Mr-Mime', 'mr-mime'],
    ['  Nidoran-F  ', 'nidoran-f'],
    ['898-1', '898-1'],
  ])('normalizes %s', (value, expected) => {
    expect(normalizePokemonName(value)).toBe(expected);
  });

  it.each(['', 'not a pokemon', '../secret', 'a'.repeat(101)])('rejects invalid names: %s', (value) => {
    expect(normalizePokemonName(value)).toBeNull();
  });

  it('rejects malformed API responses before route rendering', () => {
    expect(isPokemonDetailResponse({ id: 25, name: 'pikachu' })).toBe(false);
    expect(
      isPokemonDetailResponse({
        id: 25,
        name: 'pikachu',
        types: [{ slot: 1, type: { name: 'electric', url: '' } }],
        stats: [{ base_stat: 35, effort: 0, stat: { name: 'hp', url: '' } }],
        sprites: {},
      }),
    ).toBe(true);
  });
});
