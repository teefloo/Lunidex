import { describe, expect, it } from 'vitest';
import { tcgCustomCollectionsTranslations } from './tcg-custom-collections';

describe('custom TCG collection translations', () => {
  it('provides the same complete set of localized strings in all supported languages', () => {
    const expectedKeys = Object.keys(tcgCustomCollectionsTranslations.en).sort();

    for (const [language, translations] of Object.entries(tcgCustomCollectionsTranslations)) {
      expect(Object.keys(translations).sort(), language).toEqual(expectedKeys);
      expect(Object.values(translations).every((value) => value.trim().length > 0), language).toBe(true);
    }
  });
});
