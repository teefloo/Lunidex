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

describe('Nuzlocke localization', () => {
  it('provides the command palette title in every supported locale', () => {
    for (const [locale, bundle] of Object.entries(bundles)) {
      expect(bundle.translation.nuzlocke.title, `${locale}.nuzlocke.title`).toBeTruthy();
    }
  });
});
