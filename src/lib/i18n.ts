"use client";

import i18n from 'i18next';
import type { TOptions } from 'i18next';
import { initReactI18next, useTranslation as useReactTranslation } from 'react-i18next';
import enTranslations from './i18n/en';
import { useMounted } from '@/hooks/useMounted';
import type { SupportedLanguage } from './languages';

// Lazy-load map for on-demand language loading
type TranslationBundle = {
  default: {
    translation: object;
  };
};

const languageResources: Partial<Record<SupportedLanguage, () => Promise<TranslationBundle>>> = {
  fr: () => import('./i18n/fr'),
  es: () => import('./i18n/es'),
  de: () => import('./i18n/de'),
  it: () => import('./i18n/it'),
  ja: () => import('./i18n/ja'),
  ko: () => import('./i18n/ko'),
  zh: () => import('./i18n/zh'),
  pt: () => import('./i18n/pt'),
};

// Keep the first client render aligned with SSR.
// The user's preferred language is restored right after hydration in Providers.
const getInitialLang = () => 'en';

// Initialize with English only (smallest initial bundle)
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: enTranslations,
    },
    lng: getInitialLang(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Dynamically load a language and add it to i18n
export const loadLanguage = async (lang: string): Promise<void> => {
  if (lang === 'en' || !languageResources[lang as SupportedLanguage]) return;

  const hasResourceBundle = i18n.hasResourceBundle(lang, 'translation');
  if (hasResourceBundle) return;

  try {
    const langModule = await languageResources[lang as SupportedLanguage]?.();
    if (!langModule) return;
    i18n.addResourceBundle(lang, 'translation', langModule.default.translation, true, true);
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

export const useTranslation = () => {
  const mounted = useMounted();
  const translation = useReactTranslation();
  const t = mounted ? translation.t : i18n.getFixedT('en', 'translation');
  return { ...translation, t };
};
export const t = (key: string, options?: TOptions) => i18n.t(key, options);

export default i18n;
