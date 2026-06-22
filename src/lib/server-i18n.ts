import { cookies } from 'next/headers';
import { createInstance } from 'i18next';
import type { i18n as I18nInstance, TFunction, TOptions } from 'i18next';

import { isSupportedLanguage, type SupportedLanguage } from './languages';

import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import de from './i18n/de';
import it from './i18n/it';
import ja from './i18n/ja';
import ko from './i18n/ko';
import zh from './i18n/zh';

const SERVER_LANG_COOKIE = 'primedex-lang';

const serverResources = {
  en: { translation: en.translation },
  fr: { translation: fr.translation },
  es: { translation: es.translation },
  de: { translation: de.translation },
  it: { translation: it.translation },
  ja: { translation: ja.translation },
  ko: { translation: ko.translation },
  zh: { translation: zh.translation },
};

const serverI18n: I18nInstance = createInstance();
let initialized = false;

function ensureInit(): void {
  if (initialized) return;
  serverI18n.init({
    resources: serverResources,
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
  });
  initialized = true;
}

async function readLanguageCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(SERVER_LANG_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function getServerLanguage(): Promise<SupportedLanguage> {
  const cookieLang = await readLanguageCookie();
  return isSupportedLanguage(cookieLang ?? '') ? (cookieLang as SupportedLanguage) : 'en';
}

export async function getServerT(): Promise<TFunction> {
  ensureInit();
  const lang = await getServerLanguage();
  return serverI18n.getFixedT(lang, 'translation');
}

// Synchronous, language-explicit translator. Used where the locale comes from
// the request (e.g. `?lang=` on OG image routes) instead of the cookie.
export function getServerTForLanguage(lang: SupportedLanguage): TFunction {
  ensureInit();
  return serverI18n.getFixedT(lang, 'translation');
}

// Map SupportedLanguage -> PokeAPI species `language.name` values.
// PokeAPI uses BCP-47 codes for the `names[]` array (en, fr, de, es, it, ja, ko, zh-Hans, zh-Hant).
// Portuguese has no PokeAPI species translation, so it falls back to English.
const POKEAPI_SPECIES_LANGUAGE: Record<SupportedLanguage, string> = {
  en: 'en',
  fr: 'fr',
  de: 'de',
  es: 'es',
  it: 'it',
  ja: 'ja',
  ko: 'ko',
  zh: 'zh-Hans',
};

export async function getServerPokemonLanguage(): Promise<string> {
  const lang = await getServerLanguage();
  return POKEAPI_SPECIES_LANGUAGE[lang];
}

// Sync fallback that always renders in English.
// Prefer `getServerT()` in async server components for language-aware rendering.
export const t = (key: string, options?: TOptions): string => {
  ensureInit();
  return serverI18n.getFixedT('en', 'translation')(key, options);
};
