import { describe, expect, it } from 'vitest';
import de from './i18n/de';
import en from './i18n/en';
import es from './i18n/es';
import fr from './i18n/fr';
import itLocale from './i18n/it';
import ja from './i18n/ja';
import ko from './i18n/ko';
import zh from './i18n/zh';
import { FEATURED_POKEMON } from './pokemon-featured';

const locales = { de, en, es, fr, it: itLocale, ja, ko, zh };

describe('featured Pokédex Pokémon translations', () => {
  it('provides one non-empty name for every shortcut in all supported locales', () => {
    const expectedSlugs = FEATURED_POKEMON.map((pokemon) => pokemon.slug).sort();

    for (const locale of Object.values(locales)) {
      const names = locale.translation.pokedex_page.featured_pokemon;
      expect(Object.keys(names).sort()).toEqual(expectedSlugs);
      expect(Object.values(names).every((name) => name.trim().length > 0)).toBe(true);
    }
  });

  it('uses French Pokémon names instead of English slugs', () => {
    expect(fr.translation.pokedex_page.featured_pokemon).toMatchObject({
      charizard: 'Dracaufeu',
      garchomp: 'Carchacrok',
      eevee: 'Évoli',
      snorlax: 'Ronflex',
      gengar: 'Ectoplasma',
      machamp: 'Mackogneur',
      lapras: 'Lokhlass',
      gyarados: 'Léviator',
    });
  });
});
