import { cookies, headers } from 'next/headers';
import { createInstance } from 'i18next';
import type { i18n as I18nInstance, ResourceLanguage, TFunction, TOptions } from 'i18next';

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

// `proxy.ts` forwards the URL's locale segment (e.g. `/fr/...`) as this
// request header so the current render uses it immediately — the cookie it
// also sets only takes effect on the *next* request.
async function readLanguageHeader(): Promise<string | null> {
  try {
    const store = await headers();
    return store.get('x-primedex-lang');
  } catch {
    return null;
  }
}

export async function getServerLanguage(): Promise<SupportedLanguage> {
  const headerLang = await readLanguageHeader();
  if (isSupportedLanguage(headerLang ?? '')) return headerLang as SupportedLanguage;

  const cookieLang = await readLanguageCookie();
  return isSupportedLanguage(cookieLang ?? '') ? (cookieLang as SupportedLanguage) : 'en';
}

export async function getServerT(): Promise<TFunction> {
  ensureInit();
  const lang = await getServerLanguage();
  return serverI18n.getFixedT(lang, 'translation');
}

export function getServerTranslations(lang: SupportedLanguage): ResourceLanguage {
  return serverResources[lang].translation;
}

const EDITORIAL_CLIENT_TRANSLATION_PATHS = [
  'common',
  'nav',
  'tcg.nav_collection',
  'header',
  'languages',
  'settings',
  'auth',
  'dashboard.title',
  'command_palette',
  'search',
  'legal.banner',
  'pwa',
] as const;

const TCG_CARD_CLIENT_TRANSLATION_PATHS = [
  ...EDITORIAL_CLIENT_TRANSLATION_PATHS,
  'tcg',
  'stats',
  'detail',
] as const;

function isTranslationRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function selectClientTranslations(
  lang: SupportedLanguage,
  paths: readonly string[],
): ResourceLanguage {
  const source = serverResources[lang].translation as unknown as Record<string, unknown>;
  const selected: Record<string, unknown> = {};

  for (const path of paths) {
    const segments = path.split('.');
    let sourceValue: unknown = source;
    let target: Record<string, unknown> = selected;

    for (const [index, segment] of segments.entries()) {
      if (!isTranslationRecord(sourceValue)) break;
      sourceValue = sourceValue[segment];
      if (index === segments.length - 1 || sourceValue === undefined) {
        if (index === segments.length - 1 && sourceValue !== undefined) {
          target[segment] = sourceValue;
        }
        break;
      }
      const existing = target[segment];
      if (!isTranslationRecord(existing)) {
        target[segment] = {};
      }
      target = target[segment] as Record<string, unknown>;
    }
  }

  return selected as ResourceLanguage;
}

/**
 * Editorial pages render their article copy on the server. Keep only the
 * client-facing shell strings in the RSC payload; the complete locale bundle
 * remains available through `loadLanguage` when an interactive feature needs
 * it or the user changes language.
 */
export function getEditorialClientTranslations(lang: SupportedLanguage): ResourceLanguage {
  return selectClientTranslations(lang, EDITORIAL_CLIENT_TRANSLATION_PATHS);
}

export interface InitialClientTranslations {
  translations: ResourceLanguage;
  partial: boolean;
}

/** Select a small initial client bundle for routes with known translation needs. */
export function getInitialClientTranslations(
  lang: SupportedLanguage,
  pathname: string,
): InitialClientTranslations {
  if (/^\/(?:en|fr|es|de|it|ja|ko|zh)\/(?:guides|compare)(?:\/|$)/.test(pathname)) {
    return { translations: getEditorialClientTranslations(lang), partial: true };
  }

  if (/^\/(?:en|fr|es|de|it|ja|ko|zh)\/tcg\/cards\/[^/]+\/?$/.test(pathname)) {
    return { translations: selectClientTranslations(lang, TCG_CARD_CLIENT_TRANSLATION_PATHS), partial: true };
  }

  return { translations: getServerTranslations(lang), partial: false };
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
