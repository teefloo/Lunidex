import { describe, it, expect } from 'vitest';
import {
  supportedLanguages,
  languageToMetadataLocale,
  languageToOpenGraphLocale,
  languageToPokemonLanguageId,
  isSupportedLanguage,
  resolveLanguage,
  getLanguageId,
  getLanguageAlternates,
} from './languages';

describe('locale maps', () => {
  it('cover every supported language', () => {
    for (const lang of supportedLanguages) {
      expect(languageToMetadataLocale[lang]).toBeTruthy();
      expect(languageToOpenGraphLocale[lang]).toBeTruthy();
      expect(typeof languageToPokemonLanguageId[lang]).toBe('number');
    }
  });

  it('uses BCP-47 style metadata locales and underscore OG locales', () => {
    expect(languageToMetadataLocale.zh).toBe('zh-CN');
    expect(languageToOpenGraphLocale.zh).toBe('zh_CN');
  });
});

describe('isSupportedLanguage', () => {
  it('accepts supported codes', () => {
    expect(isSupportedLanguage('fr')).toBe(true);
    expect(isSupportedLanguage('ja')).toBe(true);
  });

  it('rejects unsupported codes', () => {
    expect(isSupportedLanguage('xx')).toBe(false);
    expect(isSupportedLanguage('EN')).toBe(false);
    expect(isSupportedLanguage('')).toBe(false);
  });
});

describe('resolveLanguage', () => {
  it('returns the explicit language when supported', () => {
    expect(resolveLanguage('de', 'en')).toBe('de');
  });

  it('falls back to the system language for "auto"', () => {
    expect(resolveLanguage('auto', 'ko')).toBe('ko');
  });

  it('falls back to system language for null/undefined', () => {
    expect(resolveLanguage(null, 'fr')).toBe('fr');
    expect(resolveLanguage(undefined, 'fr')).toBe('fr');
  });

  it('falls back to "en" when both inputs are unsupported', () => {
    expect(resolveLanguage('zz', 'qq')).toBe('en');
  });

  it('falls back to system language when the explicit value is unsupported', () => {
    expect(resolveLanguage('zz', 'it')).toBe('it');
  });
});

describe('getLanguageId', () => {
  it('maps a resolved language to its PokeAPI language id', () => {
    expect(getLanguageId('ja', 'en')).toBe(11);
    expect(getLanguageId('auto', 'fr')).toBe(5);
  });
});

describe('getLanguageAlternates', () => {
  it('normalizes paths without a leading slash', () => {
    const alts = getLanguageAlternates('foo');
    expect(alts['en-US']).toBe('/foo');
  });

  it('includes an x-default entry and all locales', () => {
    const alts = getLanguageAlternates('/bar');
    expect(alts['x-default']).toBe('/bar');
    expect(Object.keys(alts)).toHaveLength(supportedLanguages.length + 1);
  });

  it('defaults to root path', () => {
    const alts = getLanguageAlternates();
    expect(alts['en-US']).toBe('/');
  });
});
