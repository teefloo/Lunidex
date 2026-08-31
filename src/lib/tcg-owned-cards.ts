import {
  countPhysicalTCGCards,
  decodeTCGCollectionCardKey,
  deriveTCGOwnedCardIds,
  normalizeTCGCollectionCardKeys,
  normalizeTCGCollectionKeys,
  normalizeTCGLegacyOwnedCards,
  MAX_TCG_COLLECTION_PHYSICAL_CARDS,
} from '@primedex/core/lib/tcg-collections';
import { DEFAULT_TCG_CARD_LANGUAGE, normalizeTCGCardLanguage } from '@primedex/core/lib/tcg-language';
import {
  DEFAULT_TCG_DISPLAY_CURRENCY,
  isTCGDisplayCurrency,
  normalizeTCGDisplayCurrency,
} from '@primedex/core/lib/tcg-currency';

/** The distinct compatibility index cannot exceed the global physical cap. */
export const MAX_TCG_OWNED_CARDS = MAX_TCG_COLLECTION_PHYSICAL_CARDS;
export const MAX_TCG_COLLECTIONS = 5000;
export const MAX_TCG_COLLECTION_CARDS = 10000;
const MAX_TCG_CARD_ID_LENGTH = 128;
const TCG_CARD_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i;

export function normalizeTcgCardId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').trim().toLowerCase();
  return normalized
    && normalized.length <= MAX_TCG_CARD_ID_LENGTH
    && TCG_CARD_ID_PATTERN.test(normalized)
    ? normalized
    : null;
}

export function isValidTcgCardId(value: unknown): value is string {
  return typeof value === 'string'
    && value === value.trim()
    && value.length > 0
    && value.length <= MAX_TCG_CARD_ID_LENGTH
    && TCG_CARD_ID_PATTERN.test(value);
}

export function normalizeTcgOwnedCards(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_TCG_OWNED_CARDS) return null;
  const result = new Set<string>();
  for (const entry of value) {
    const id = normalizeTcgCardId(entry);
    if (!id) return null;
    result.add(id);
  }
  return [...result];
}

/** Validates and upgrades v1/v2/v3 user state without guessing a card language. */
export function normalizeUserStateData(data: Record<string, unknown>): Record<string, unknown> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const tcgKeys = [
    'tcgOwnedCards',
    'tcgLegacyOwnedCards',
    'tcgCollections',
    'tcgCollectionCards',
    'tcgActiveCollections',
    'tcgBrowseLanguage',
    'tcgDisplayCurrency',
    'tcgCollectionModelVersion',
  ];
  const hasTcgField = tcgKeys.some((key) => Object.prototype.hasOwnProperty.call(data, key));
  if (!hasTcgField) return data;

  // The former quantity/variant experiment is not part of the language-aware
  // model. Reject it instead of silently persisting a second ownership shape.
  if (Object.prototype.hasOwnProperty.call(data, 'tcgCollectionCardQuantities')) return null;

  const modelVersion = data.tcgCollectionModelVersion;
  if (modelVersion !== undefined && modelVersion !== 1 && modelVersion !== 2 && modelVersion !== 3) return null;
  const isExplicitV1 = modelVersion === 1;

  // Empty v2 arrays may have been appended by a v1 exporter. Only an
  // explicit version or a non-empty language-aware projection proves that
  // `tcgOwnedCards` is already a derived compatibility index.
  const hasV2 = !isExplicitV1 && (modelVersion === 2
    || (Array.isArray(data.tcgLegacyOwnedCards) && data.tcgLegacyOwnedCards.length > 0)
    || (Array.isArray(data.tcgCollections) && data.tcgCollections.length > 0)
    || (Array.isArray(data.tcgCollectionCards) && data.tcgCollectionCards.length > 0)
    || (Array.isArray(data.tcgActiveCollections) && data.tcgActiveCollections.length > 0));

  // Historical v1 IDs are deliberately validated with the lossless legacy
  // codec: unlike a live card token, an old identifier must not be rewritten
  // or rejected merely because a future TCGdex format uses a different shape.
  // Language-aware v2 compatibility indexes remain strict card IDs.
  const rawOwned = Object.prototype.hasOwnProperty.call(data, 'tcgOwnedCards')
    ? hasV2
      ? normalizeTcgOwnedCards(data.tcgOwnedCards)
      : normalizeTCGLegacyOwnedCards(data.tcgOwnedCards, MAX_TCG_OWNED_CARDS)
    : [];
  if (!rawOwned) return null;

  const hasLegacyField = Object.prototype.hasOwnProperty.call(data, 'tcgLegacyOwnedCards');
  const suppliedLegacy = hasLegacyField
    ? normalizeTCGLegacyOwnedCards(data.tcgLegacyOwnedCards, MAX_TCG_OWNED_CARDS)
    : [];
  if (!suppliedLegacy) return null;

  const legacyOwnedCards = isExplicitV1 || !hasV2
    ? rawOwned
    : suppliedLegacy;
  if (!legacyOwnedCards) return null;

  const collections = Object.prototype.hasOwnProperty.call(data, 'tcgCollections')
    ? normalizeTCGCollectionKeys(data.tcgCollections, MAX_TCG_COLLECTIONS)
    : [];
  const collectionCards = Object.prototype.hasOwnProperty.call(data, 'tcgCollectionCards')
    ? normalizeTCGCollectionCardKeys(data.tcgCollectionCards, MAX_TCG_COLLECTION_CARDS)
    : [];
  const activeCollections = Object.prototype.hasOwnProperty.call(data, 'tcgActiveCollections')
    ? normalizeTCGCollectionKeys(data.tcgActiveCollections, MAX_TCG_COLLECTIONS)
    : [];
  if (!collections || !collectionCards || !activeCollections) return null;

  const collectionSet = new Set(collections);
  if (activeCollections.some((key) => !collectionSet.has(key))) return null;
  if (collectionCards.some((entry) => {
    const decoded = decodeTCGCollectionCardKey(entry);
    return !decoded || !collectionSet.has(decoded.collectionKey);
  })) return null;

  const browseLanguage = Object.prototype.hasOwnProperty.call(data, 'tcgBrowseLanguage')
    ? normalizeTCGCardLanguage(data.tcgBrowseLanguage)
    : DEFAULT_TCG_CARD_LANGUAGE;
  if (!browseLanguage) return null;
  const displayCurrency = Object.prototype.hasOwnProperty.call(data, 'tcgDisplayCurrency')
    ? typeof data.tcgDisplayCurrency === 'string'
      && isTCGDisplayCurrency(data.tcgDisplayCurrency.trim().toUpperCase())
      ? normalizeTCGDisplayCurrency(data.tcgDisplayCurrency)
      : null
    : DEFAULT_TCG_DISPLAY_CURRENCY;
  if (!displayCurrency) return null;
  if (countPhysicalTCGCards(collectionCards, legacyOwnedCards) > MAX_TCG_COLLECTION_CARDS) return null;

  return {
    ...data,
    tcgOwnedCards: deriveTCGOwnedCardIds(collectionCards, legacyOwnedCards).slice(0, MAX_TCG_OWNED_CARDS),
    tcgLegacyOwnedCards: legacyOwnedCards,
    tcgCollections: collections,
    tcgCollectionCards: collectionCards,
    tcgActiveCollections: activeCollections,
    tcgBrowseLanguage: browseLanguage,
    tcgDisplayCurrency: normalizeTCGDisplayCurrency(displayCurrency),
    tcgCollectionModelVersion: 3,
  };
}
