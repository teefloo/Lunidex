import { describe, expect, it } from 'vitest';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import de from './i18n/de';
import itLocale from './i18n/it';
import ja from './i18n/ja';
import ko from './i18n/ko';
import zh from './i18n/zh';

describe('Pokédex localized copy', () => {
  it('provides result interpolation tokens in every supported locale', () => {
    for (const bundle of [en, fr, es, de, itLocale, ja, ko, zh]) {
      expect(bundle.translation.list.showing).toEqual(expect.stringContaining('{{shown}}'));
      expect(bundle.translation.list.showing).toEqual(expect.stringContaining('{{total}}'));
      expect(bundle.translation.filters.apply).not.toBe('Apply Filters');
    }
  });
});
