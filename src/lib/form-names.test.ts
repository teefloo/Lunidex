import { describe, expect, it } from 'vitest';
import { getBaseSpeciesName, getFormDisplayName, getPokemonDisplayName } from './form-names';

describe('Pokémon display names', () => {
  it('keeps a normal species name human-readable', () => {
    expect(getFormDisplayName('pikachu', 'Pikachu', 'en')).toBe('Pikachu');
  });

  it('normalizes Mega, Mega X, and Mega Y forms', () => {
    expect(getFormDisplayName('venusaur-mega', 'Venusaur', 'en')).toBe('Venusaur Mega');
    expect(getFormDisplayName('charizard-mega-x', 'Charizard', 'en')).toBe('Charizard Mega X');
    expect(getFormDisplayName('charizard-mega-y', 'Charizard', 'en')).toBe('Charizard Mega Y');
  });

  it('uses localized form labels when PokéAPI provides them', () => {
    const form = {
      name: 'charizard-mega-x',
      form_name: 'mega-x',
      form_names: [
        { name: 'Mega Charizard X', language: { name: 'en' } },
        { name: 'Méga-Dracaufeu X', language: { name: 'fr' } },
      ],
    };

    expect(getPokemonDisplayName({
      name: 'charizard-mega-x',
      baseLocalizedName: 'Dracaufeu',
      baseSpeciesName: 'charizard',
      lang: 'fr',
      form,
    })).toBe('Dracaufeu Méga X');
  });

  it('covers regional, Crowned, Origin, Therian, G-Max, and multi-word forms', () => {
    expect(getFormDisplayName('raichu-alola', 'Raichu', 'en')).toContain('Alolan');
    expect(getFormDisplayName('zacian-crowned', 'Zacian', 'en')).toBe('Zacian Crowned Sword');
    expect(getFormDisplayName('zamazenta-crowned', 'Zamazenta', 'en')).toBe('Zamazenta Crowned Shield');
    expect(getFormDisplayName('giratina-origin', 'Giratina', 'en')).toBe('Giratina Origin Forme');
    expect(getFormDisplayName('shaymin-sky', 'Shaymin', 'en')).toBe('Shaymin Sky Forme');
    expect(getFormDisplayName('tornadus-therian', 'Tornadus', 'en')).toBe('Tornadus Therian Forme');
    expect(getFormDisplayName('pikachu-gmax', 'Pikachu', 'en')).toBe('Pikachu G-Max');
    expect(getFormDisplayName('urshifu-rapid-strike', 'Urshifu', 'en')).toBe('Urshifu Rapid Strike Style');
  });

  it('humanizes an unknown future form when the species relation is known', () => {
    expect(getPokemonDisplayName({
      name: 'pikachu-future-form',
      baseLocalizedName: 'Pikachu',
      baseSpeciesName: 'pikachu',
      lang: 'en',
    })).toBe('Pikachu Future Form');
  });
});

describe('Pokémon form base slugs', () => {
  it('does not split a form at a one-letter substring', () => {
    expect(getBaseSpeciesName('zacian-crowned')).toBe('zacian');
    expect(getBaseSpeciesName('arceus-fire')).toBe('arceus');
    expect(getBaseSpeciesName('unown-c')).toBe('unown');
  });
});
