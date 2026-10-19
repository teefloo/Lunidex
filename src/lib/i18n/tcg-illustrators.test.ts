import { describe, expect, it } from 'vitest';
import { tcgIllustratorTranslations } from './tcg-illustrators';

describe('TCG illustrator translations', () => {
  it('provides the same public gallery keys in all supported UI languages', () => {
    const languages = Object.values(tcgIllustratorTranslations);
    const expectedKeys = Object.keys(tcgIllustratorTranslations.en).sort();

    expect(languages).toHaveLength(8);
    for (const language of languages) {
      expect(Object.keys(language).sort()).toEqual(expectedKeys);
      expect(Object.values(language).every((value) => value.length > 0)).toBe(true);
    }
  });
});
