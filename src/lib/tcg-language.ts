export {
  TCG_CARD_LANGUAGES,
  TCG_CARD_LANGUAGE_ENGLISH_NAMES,
  DEFAULT_TCG_CARD_LANGUAGE,
  getTCGCardLanguageName,
  isTCGCardLanguage,
  normalizeTCGCardLanguage,
  type TCGCardLanguage,
} from '@primedex/core/lib/tcg-language';

import {
  DEFAULT_TCG_CARD_LANGUAGE,
  normalizeTCGCardLanguage,
} from '@primedex/core/lib/tcg-language';

/**
 * Resolves an explicit `tcgLang` query value without consulting the persisted
 * preference. An absent query value is intentionally distinct from an invalid
 * one so callers can decide when the preference is allowed to apply.
 */
export function resolveRequestedTCGCardLanguage(
  value: string | null | undefined,
): import('@primedex/core/lib/tcg-language').TCGCardLanguage | null {
  if (value == null) return null;

  return normalizeTCGCardLanguage(value, DEFAULT_TCG_CARD_LANGUAGE);
}
