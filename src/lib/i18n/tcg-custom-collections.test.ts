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

  it('labels the default sort as the saved manual binder order in every locale', () => {
    expect(Object.fromEntries(Object.entries(tcgCustomCollectionsTranslations).map(([language, translations]) => [language, translations.sort_added]))).toEqual({
      en: 'Saved manual binder order',
      fr: 'Ordre manuel enregistré du classeur',
      es: 'Orden manual guardado del álbum',
      de: 'Gespeicherte manuelle Ordnerreihenfolge',
      it: 'Ordine manuale salvato del raccoglitore',
      ja: '保存済みの手動カード順',
      ko: '저장된 수동 카드 순서',
      zh: '已保存的手动卡牌顺序',
    });
  });
});
