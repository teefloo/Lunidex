import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@primedex/core/i18n/en';

/**
 * Mobile i18n bootstrap. Reuses the exact translation bundles shipped in
 * @primedex/core (single source of truth with the web app). English is baked
 * in for the first render; other locales are lazy-loaded on demand to keep the
 * initial JS bundle small — mirroring the web strategy.
 */
type Bundle = { default: { translation: object } };

const loaders: Record<string, () => Promise<Bundle>> = {
  fr: () => import('@primedex/core/i18n/fr'),
  es: () => import('@primedex/core/i18n/es'),
  de: () => import('@primedex/core/i18n/de'),
  it: () => import('@primedex/core/i18n/it'),
  ja: () => import('@primedex/core/i18n/ja'),
  ko: () => import('@primedex/core/i18n/ko'),
  zh: () => import('@primedex/core/i18n/zh'),
};

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { en },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export async function loadLanguage(lang: string): Promise<void> {
  if (lang === 'en' || !loaders[lang]) return;
  if (i18n.hasResourceBundle(lang, 'translation')) return;
  try {
    const mod = await loaders[lang]();
    i18n.addResourceBundle(lang, 'translation', mod.default.translation, true, true);
  } catch (error) {
    console.warn(`[i18n] failed to load "${lang}"`, error);
  }
}

export default i18n;
