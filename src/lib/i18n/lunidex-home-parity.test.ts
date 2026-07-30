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
  it('includes every Lunidex home key in every supported locale', () => {
    for (const bundle of Object.values(bundles)) {
      expect(Object.keys(bundle.translation.lunidex_home)).toEqual(expect.arrayContaining(reference));
      expect(Object.keys(bundle.translation.pokedex)).toEqual(expect.arrayContaining(['title', 'description', 'meta_title', 'meta_description']));
    }
  });
});
