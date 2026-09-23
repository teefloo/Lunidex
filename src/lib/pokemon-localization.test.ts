import { describe, expect, it } from 'vitest';
import { getPokemonApiLanguageCode } from './languages';
import { getCurrentEvolutionSpeciesName } from './evolution-utils';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import de from './i18n/de';
import itMessages from './i18n/it';
import ja from './i18n/ja';
import ko from './i18n/ko';
import zh from './i18n/zh';

describe('Pokémon localized detail helpers', () => {
  it('matches the Simplified Chinese language code used by PokéAPI', () => {
    expect(getPokemonApiLanguageCode('zh')).toBe('zh-Hans');
    expect(getPokemonApiLanguageCode('fr')).toBe('fr');
  });

  it('keeps complete hyphenated species names for the current evolution marker', () => {
    expect(getCurrentEvolutionSpeciesName('mr-mime', 'mr-mime')).toBe('mr-mime');
    expect(getCurrentEvolutionSpeciesName(undefined, 'ho-oh')).toBe('ho-oh');
  });

  it('provides localized evolution and card error labels in every web language', () => {
    for (const locale of [en, fr, es, de, itMessages, ja, ko, zh]) {
      expect(locale.translation.detail.current.trim().length).toBeGreaterThan(0);
      expect(locale.translation.detail.cards_error.trim().length).toBeGreaterThan(0);
    }
  });
});
