"use client";

import { createInstance } from 'i18next';
import type { i18n as I18nInstance, ResourceLanguage } from 'i18next';
import { initReactI18next, useTranslation as useReactTranslation } from 'react-i18next';
import type { SupportedLanguage } from './languages';

// Lazy-load map for on-demand language loading
type TranslationBundle = {
  default: {
    translation: object;
  };
};

export interface ClientI18nOptions {
  initialTranslationsPartial?: boolean;
}

const partialLanguageBundles = new WeakMap<object, Set<SupportedLanguage>>();

const languageResources: Partial<Record<SupportedLanguage, () => Promise<TranslationBundle>>> = {
  en: () => import('./i18n/en'),
  fr: () => import('./i18n/fr'),
  es: () => import('./i18n/es'),
  de: () => import('./i18n/de'),
  it: () => import('./i18n/it'),
  ja: () => import('./i18n/ja'),
  ko: () => import('./i18n/ko'),
  zh: () => import('./i18n/zh'),
};

export function createClientI18n(
  initialLanguage: SupportedLanguage,
  initialTranslations: ResourceLanguage,
  options: ClientI18nOptions = {},
): I18nInstance {
  const instance = createInstance();
  const resources = {
    [initialLanguage]: { translation: initialTranslations },
  };

  void instance.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    initAsync: false,
    interpolation: {
      escapeValue: false,
    },
  });

  if (options.initialTranslationsPartial) {
    partialLanguageBundles.set(instance, new Set([initialLanguage]));
  }

  return instance;
}

export function isLanguageBundlePartial(instance: I18nInstance, lang: SupportedLanguage): boolean {
  return partialLanguageBundles.get(instance)?.has(lang) ?? false;
}

export const loadLanguage = async (
  instance: I18nInstance,
  lang: SupportedLanguage,
): Promise<void> => {
  if (!languageResources[lang]) return;

  const hasResourceBundle = instance.hasResourceBundle(lang, 'translation');
  if (hasResourceBundle && !isLanguageBundlePartial(instance, lang)) return;

  try {
    const langModule = await languageResources[lang]?.();
    if (!langModule) return;
    instance.addResourceBundle(lang, 'translation', langModule.default.translation, true, true);
    partialLanguageBundles.get(instance)?.delete(lang);
  } catch (error) {
    console.error(`Failed to load language: ${lang}`, error);
  }
};

const LANG_COOKIE = 'primedex-lang';
const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function persistLanguageCookie(lang: string): void {
  if (typeof document === 'undefined') return;
  const safe = lang.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safe) return;
  document.cookie = `${LANG_COOKIE}=${safe}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
}

export const useTranslation = useReactTranslation;
