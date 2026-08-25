import { describe, expect, it } from 'vitest';
import de from './de';
import en from './en';
import es from './es';
import fr from './fr';
import itLocale from './it';
import ja from './ja';
import ko from './ko';
import zh from './zh';

const bundles = { fr, es, de, it: itLocale, ja, ko, zh };

type Section = Record<string, unknown>;

const sectionOf = (bundle: unknown, name: string): Section =>
  ((bundle as { translation: Record<string, Section> }).translation)[name] ?? {};

// Namespaces whose keys are rendered on public, indexed routes in every
// locale. A missing key silently falls back to English, so this test keeps
// the bundles honest.
const guardedSections = ['contact', 'nav', 'share_menu'] as const;

const guardedTcgKeys = ['nav_deck_builder', 'deck_builder'] as const;

describe('public namespace localization parity', () => {
  for (const sectionName of guardedSections) {
    const referenceKeys = Object.keys(sectionOf(en, sectionName));

    it(`provides every ${sectionName}.* key with non-empty content in every supported locale`, () => {
      expect(referenceKeys.length).toBeGreaterThan(0);

      for (const [locale, bundle] of Object.entries(bundles)) {
        const section = sectionOf(bundle, sectionName);
        expect(Object.keys(section), `${locale}.${sectionName}`).toEqual(
          expect.arrayContaining(referenceKeys),
        );
        for (const key of referenceKeys) {
          expect(section[key], `${locale}.${sectionName}.${key}`).toBeTruthy();
        }
      }
    });
  }

  it('provides the deck builder navigation and workspace copy in every locale', () => {
    const reference = sectionOf(en, 'tcg');
    for (const [locale, bundle] of Object.entries(bundles)) {
      const section = sectionOf(bundle, 'tcg');
      for (const key of guardedTcgKeys) {
        expect(section[key], `${locale}.tcg.${key}`).toBeTruthy();
        if (key === 'deck_builder') {
          expect(Object.keys(section[key] as Section), `${locale}.tcg.deck_builder`).toEqual(
            expect.arrayContaining(Object.keys(reference[key] as Section)),
          );
        }
      }
    }
  });
});
