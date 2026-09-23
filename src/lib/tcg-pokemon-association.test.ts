import { describe, expect, it } from 'vitest';
import { isPokemonNameInCardTitle } from './tcg-pokemon-association';

describe('TCG Pokémon card association', () => {
  it('matches a full Pokémon name without accepting a longer Pokémon name as a substring', () => {
    expect(isPokemonNameInCardTitle('Mew', ['Mew'])).toBe(true);
    expect(isPokemonNameInCardTitle('Mew ex', ['Mew'])).toBe(true);
    expect(isPokemonNameInCardTitle('Mewtwo', ['Mew'])).toBe(false);
  });

  it('keeps cards that feature the requested Pokémon alongside another Pokémon', () => {
    expect(isPokemonNameInCardTitle('Mewtwo & Mew GX', ['Mew'])).toBe(true);
  });

  it('normalizes accents and apostrophes while matching the complete title token', () => {
    expect(isPokemonNameInCardTitle('Farfetch’d', ['farfetchd'])).toBe(true);
    expect(isPokemonNameInCardTitle('Mime Jr.', ['Míme Jr'])).toBe(true);
  });

  it('uses script boundaries for Japanese card names and suffixes', () => {
    expect(isPokemonNameInCardTitle('ミュウex', ['ミュウ'])).toBe(true);
    expect(isPokemonNameInCardTitle('ミュウツー', ['ミュウ'])).toBe(false);
  });
});
