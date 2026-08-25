export const MAX_TCG_OWNED_CARDS = 5000;
const MAX_TCG_CARD_ID_LENGTH = 128;
const TCG_CARD_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i;

/**
 * TCGdex card IDs are compact, URL-safe identifiers composed of a set ID and
 * a local card ID. Canonicalising them here keeps JSON state small and makes
 * duplicate/case variants count as the same owned card.
 */
export function normalizeTcgCardId(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.normalize('NFKC').trim().toLowerCase();
  if (
    normalized.length === 0
    || normalized.length > MAX_TCG_CARD_ID_LENGTH
    || !TCG_CARD_ID_PATTERN.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

/**
 * Validates the shape of a TCGdex card identifier without changing its case.
 * The allowed charset excludes query, fragment, and whitespace characters so
 * a validated id can only ever extend an upstream URL path segment.
 */
export function isValidTcgCardId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return (
    trimmed === value
    &&
    trimmed.length > 0
    && trimmed.length <= MAX_TCG_CARD_ID_LENGTH
    && TCG_CARD_ID_PATTERN.test(trimmed)
  );
}

/** Returns null for an invalid collection, otherwise a bounded unique list. */
export function normalizeTcgOwnedCards(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_TCG_OWNED_CARDS) return null;

  const normalized = new Set<string>();
  for (const valueEntry of value) {
    const cardId = normalizeTcgCardId(valueEntry);
    if (!cardId) return null;
    normalized.add(cardId);
  }

  return Array.from(normalized);
}

/**
 * Normalises only the server-synchronised TCG collection field. Other local
 * state fields remain opaque to preserve the established sync contract.
 */
export function normalizeUserStateData(
  data: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!Object.prototype.hasOwnProperty.call(data, 'tcgOwnedCards')) return data;

  const tcgOwnedCards = normalizeTcgOwnedCards(data.tcgOwnedCards);
  if (!tcgOwnedCards) return null;

  return { ...data, tcgOwnedCards };
}
