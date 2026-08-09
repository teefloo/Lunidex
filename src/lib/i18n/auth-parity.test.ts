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

describe('authentication localization parity', () => {
  const referenceKeys = Object.keys(en.translation.auth);

  it('provides every auth key in every supported locale', () => {
    for (const [locale, bundle] of Object.entries(bundles)) {
      const auth = bundle.translation.auth as Record<string, unknown>;

      expect(Object.keys(auth), locale).toEqual(expect.arrayContaining(referenceKeys));
      for (const key of referenceKeys) {
        expect(auth[key], `${locale}.auth.${key}`).toBeTruthy();
      }
    }
  });
});
