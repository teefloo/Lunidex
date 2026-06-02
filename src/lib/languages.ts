export const supportedLanguages = ['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh', 'pt'] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];
export type AppLanguage = SupportedLanguage | 'auto';

export const languageToMetadataLocale = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  de: 'de-DE',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  pt: 'pt-BR',
} as const satisfies Record<SupportedLanguage, string>;

export const languageToOpenGraphLocale = {
  en: 'en_US',
  fr: 'fr_FR',
  es: 'es_ES',
  de: 'de_DE',
  it: 'it_IT',
  ja: 'ja_JP',
  ko: 'ko_KR',
  zh: 'zh_CN',
  pt: 'pt_BR',
} as const satisfies Record<SupportedLanguage, string>;

export const languageToPokemonLanguageId = {
  en: 9,
  fr: 5,
  es: 7,
  de: 6,
  it: 8,
  ja: 11,
  ko: 3,
  zh: 12,
  pt: 9, // No official Pokemon language ID for Portuguese; fallback to English
} as const satisfies Record<SupportedLanguage, number>;

export function isSupportedLanguage(language: string): language is SupportedLanguage {
  return (supportedLanguages as readonly string[]).includes(language);
}

export function getBrowserLanguage(fallback: SupportedLanguage = 'en'): SupportedLanguage {
  if (typeof navigator === 'undefined') {
    return fallback;
  }

  const candidate = (navigator.languages?.[0] ?? navigator.language ?? fallback).split('-')[0];
  return isSupportedLanguage(candidate) ? candidate : fallback;
}

export function resolveLanguage(language: string | null | undefined, systemLanguage: string): SupportedLanguage {
  const fallbackLanguage = isSupportedLanguage(systemLanguage) ? systemLanguage : 'en';

  if (!language || language === 'auto') {
    return fallbackLanguage;
  }

  return isSupportedLanguage(language) ? language : fallbackLanguage;
}

export function getLanguageId(language: string | null | undefined, systemLanguage: string): number {
  return languageToPokemonLanguageId[resolveLanguage(language, systemLanguage)];
}

export function getLanguageAlternates(pathname = '/'): Record<string, string> {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

  return {
    [languageToMetadataLocale.en]: normalizedPath,
    [languageToMetadataLocale.fr]: normalizedPath,
    [languageToMetadataLocale.es]: normalizedPath,
    [languageToMetadataLocale.de]: normalizedPath,
    [languageToMetadataLocale.it]: normalizedPath,
    [languageToMetadataLocale.ja]: normalizedPath,
    [languageToMetadataLocale.ko]: normalizedPath,
    [languageToMetadataLocale.zh]: normalizedPath,
    [languageToMetadataLocale.pt]: normalizedPath,
    'x-default': normalizedPath,
  };
}
