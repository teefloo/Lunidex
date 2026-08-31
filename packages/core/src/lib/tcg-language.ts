/**
 * TCGdex data languages. These are deliberately separate from Lunidex's
 * interface locales: a user can browse French cards while using a Spanish
 * interface, and vice versa.
 */
export const TCG_CARD_LANGUAGES = [
  'en',
  'fr',
  'es',
  'it',
  'pt',
  'pt-br',
  'pt-pt',
  'de',
  'nl',
  'pl',
  'ru',
  'ja',
  'ko',
  'zh-tw',
  'id',
  'th',
  'zh-cn',
] as const;

export type TCGCardLanguage = (typeof TCG_CARD_LANGUAGES)[number];

export const DEFAULT_TCG_CARD_LANGUAGE: TCGCardLanguage = 'en';

const TCG_CARD_LANGUAGE_SET = new Set<string>(TCG_CARD_LANGUAGES);

/** Returns true only for an official TCGdex language code. */
export function isTCGCardLanguage(value: unknown): value is TCGCardLanguage {
  return typeof value === 'string' && TCG_CARD_LANGUAGE_SET.has(value);
}

/** Normalises a user/API value without ever inferring from the UI locale. */
export function normalizeTCGCardLanguage(
  value: unknown,
  fallback: TCGCardLanguage | null = null,
): TCGCardLanguage | null {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (isTCGCardLanguage(normalized)) return normalized;
  }
  return fallback;
}

/**
 * Stable English labels used when Intl.DisplayNames is unavailable or does
 * not know a regional code. Keeping this map deterministic makes SSR and
 * import validation agree across web and native runtimes.
 */
export const TCG_CARD_LANGUAGE_ENGLISH_NAMES: Record<TCGCardLanguage, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  'pt-br': 'Portuguese (Brazil)',
  'pt-pt': 'Portuguese (Portugal)',
  de: 'German',
  nl: 'Dutch',
  pl: 'Polish',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  'zh-tw': 'Chinese (Traditional)',
  id: 'Indonesian',
  th: 'Thai',
  'zh-cn': 'Chinese (Simplified)',
};

export function getTCGCardLanguageName(
  language: TCGCardLanguage,
  displayLocale = 'en',
): string {
  try {
    const displayNames = new Intl.DisplayNames([displayLocale], { type: 'language' });
    const label = displayNames.of(language);
    if (label) return label;
    // Regional language tags are not consistently supported by all engines.
    const base = language.split('-')[0];
    const baseLabel = displayNames.of(base);
    if (baseLabel && language !== base) return `${baseLabel} (${language.toUpperCase()})`;
  } catch {
    // Deterministic fallback below.
  }
  return TCG_CARD_LANGUAGE_ENGLISH_NAMES[language];
}
