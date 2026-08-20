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

describe('GEO content localization parity', () => {
  const sectionNames = ['comparison', 'collection_guide', 'blog', 'team_guide', 'quiz_guide', 'nuzlocke_guide'] as const;
  const sections = {
    comparison: Object.keys(en.translation.comparison),
    collection_guide: Object.keys(en.translation.collection_guide),
    blog: Object.keys(en.translation.blog),
    team_guide: Object.keys(en.translation.team_guide),
    quiz_guide: Object.keys(en.translation.quiz_guide),
    nuzlocke_guide: Object.keys(en.translation.nuzlocke_guide),
  };

  it('provides every new GEO key with non-empty content in every supported locale', () => {
    for (const [locale, bundle] of Object.entries(bundles)) {
      for (const sectionName of sectionNames) {
        const referenceKeys = sections[sectionName];
        const section = (bundle.translation as unknown as {
          comparison: Record<string, unknown>;
          collection_guide: Record<string, unknown>;
          blog: Record<string, unknown>;
          team_guide: Record<string, unknown>;
          quiz_guide: Record<string, unknown>;
          nuzlocke_guide: Record<string, unknown>;
        })[sectionName];

        expect(Object.keys(section), `${locale}.${sectionName}`).toEqual(expect.arrayContaining(referenceKeys));
        for (const key of referenceKeys) {
          expect(section[key], `${locale}.${sectionName}.${key}`).toBeTruthy();
        }
      }
    }
  });
});
