import { describe, expect, it } from 'vitest';
import de from './de';
import en from './en';
import es from './es';
import fr from './fr';
import itLocale from './it';
import ja from './ja';
import ko from './ko';
import zh from './zh';

const bundles = { en, fr, es, de, it: itLocale, ja, ko, zh };

describe('Lunidex home localization parity', () => {
  const reference = Object.keys(en.translation.lunidex_home);
  const archiveReference = Object.keys(en.translation.lunidex_archive);
  const pokedexReference = Object.keys(en.translation.pokedex);
  it('includes every Lunidex home key in every supported locale', () => {
    for (const bundle of Object.values(bundles)) {
      expect(Object.keys(bundle.translation.lunidex_home)).toEqual(expect.arrayContaining(reference.filter((key) => key !== 'og_alt')));
      expect(Object.keys(bundle.translation.lunidex_archive)).toEqual(expect.arrayContaining(archiveReference));
      expect(Object.keys(bundle.translation.pokedex)).toEqual(expect.arrayContaining(pokedexReference));
    }
  });
});
