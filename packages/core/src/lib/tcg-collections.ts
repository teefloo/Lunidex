import {
  DEFAULT_TCG_CARD_LANGUAGE,
  isTCGCardLanguage,
  normalizeTCGCardLanguage,
  type TCGCardLanguage,
} from './tcg-language';

/** Version of the physical-variant collection model persisted by Lunidex. */
export const TCG_COLLECTION_MODEL_VERSION = 3 as const;
export const TCG_COLLECTION_KEY_PREFIX = 'tcg2';
export const TCG_COLLECTION_CARD_SEPARATOR = '|';
export const MAX_TCG_COLLECTION_PHYSICAL_CARDS = 10_000;

export const TCG_PHYSICAL_VARIANTS = ['normal', 'reverse', 'holo'] as const;
export type TCGPhysicalVariant = (typeof TCG_PHYSICAL_VARIANTS)[number];
export type TCGCollectionVariant = TCGPhysicalVariant | 'unspecified';

/**
 * Default finish selection for a newly qualified card. Normal is the least
 * ambiguous print, followed by holo and then reverse when that is all TCGdex
 * reports for the card.
 */
export const TCG_DEFAULT_VARIANT_ORDER = ['normal', 'holo', 'reverse'] as const satisfies readonly TCGPhysicalVariant[];

export function getTCGDefaultPhysicalVariant(
  variants: Partial<Record<TCGPhysicalVariant, boolean>> | null | undefined,
): TCGPhysicalVariant | null {
  if (!variants) return null;
  return TCG_DEFAULT_VARIANT_ORDER.find((variant) => variants[variant] === true) ?? null;
}

const COLLECTION_SEPARATOR = ':';
const MAX_SET_ID_LENGTH = 128;
const MAX_CARD_ID_LENGTH = 128;
const SET_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;
const CARD_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i;
const COLLECTION_VARIANTS = ['normal', 'reverse', 'holo', 'unspecified'] as const;

export interface TCGCollection {
  key: string;
  setId: string;
  language: TCGCardLanguage;
  modelVersion: typeof TCG_COLLECTION_MODEL_VERSION;
}

export interface TCGCollectionCardOwnership {
  key: string;
  collectionKey: string;
  cardId: string;
  setId: string;
  language: TCGCardLanguage;
  variant: TCGCollectionVariant;
  quantity: number;
  modelVersion: typeof TCG_COLLECTION_MODEL_VERSION;
}

export interface TCGCollectionState {
  tcgCollections: string[];
  tcgCollectionCards: string[];
  tcgActiveCollections: string[];
  tcgLegacyOwnedCards: string[];
  tcgOwnedCards: string[];
  tcgBrowseLanguage: TCGCardLanguage;
  tcgCollectionModelVersion: 1 | 2 | typeof TCG_COLLECTION_MODEL_VERSION;
}

function normalizeSetId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').trim().toLowerCase();
  if (!normalized || normalized.length > MAX_SET_ID_LENGTH || !SET_ID_PATTERN.test(normalized)) return null;
  return normalized;
}

function normalizeCardId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').trim().toLowerCase();
  if (!normalized || normalized.length > MAX_CARD_ID_LENGTH || !CARD_ID_PATTERN.test(normalized)) return null;
  return normalized;
}

function normalizeLegacyCardId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').trim();
  if (!normalized || normalized.length > MAX_CARD_ID_LENGTH || normalized.includes(TCG_COLLECTION_CARD_SEPARATOR)) return null;
  return normalized;
}

function normalizeCollectionVariant(value: unknown): TCGCollectionVariant | null {
  if (typeof value !== 'string') return null;
  return (COLLECTION_VARIANTS as readonly string[]).includes(value)
    ? value as TCGCollectionVariant
    : null;
}

/** Validate one physical quantity against the global collection limit. */
export function normalizeTCGCollectionQuantity(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) return null;
  if (value < 0 || value > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return null;
  return value;
}

function normalizeStoredQuantity(value: unknown): number | null {
  const normalized = normalizeTCGCollectionQuantity(value);
  return normalized !== null && normalized > 0 ? normalized : null;
}

export function encodeTCGCollectionKey(language: TCGCardLanguage | string, setId: string): string | null {
  const normalizedLanguage = normalizeTCGCardLanguage(language);
  const normalizedSetId = normalizeSetId(setId);
  return normalizedLanguage && normalizedSetId
    ? `${TCG_COLLECTION_KEY_PREFIX}:${normalizedLanguage}:${normalizedSetId}`
    : null;
}

export function decodeTCGCollectionKey(value: unknown): TCGCollection | null {
  if (typeof value !== 'string') return null;
  const parts = value.split(COLLECTION_SEPARATOR);
  if (parts.length !== 3 || parts[0] !== TCG_COLLECTION_KEY_PREFIX) return null;
  const language = normalizeTCGCardLanguage(parts[1]);
  const setId = normalizeSetId(parts[2]);
  if (!language || !setId) return null;
  const key = encodeTCGCollectionKey(language, setId);
  return key === value ? { key, setId, language, modelVersion: TCG_COLLECTION_MODEL_VERSION } : null;
}

export function isValidTCGCollectionKey(value: unknown): value is string {
  return decodeTCGCollectionKey(value) !== null;
}

export function createTCGCollection(
  setId: string,
  language: TCGCardLanguage | string = DEFAULT_TCG_CARD_LANGUAGE,
): TCGCollection | null {
  const key = encodeTCGCollectionKey(language, setId);
  return key ? decodeTCGCollectionKey(key) : null;
}

/**
 * Encode one variant quantity. The two-part v2 token remains accepted by the
 * decoder and is canonicalised to `unspecified ×1` by normalization.
 */
export function encodeTCGCollectionCardKey(
  collectionKey: string,
  cardId: string,
  variant: TCGCollectionVariant = 'unspecified',
  quantity = 1,
): string | null {
  if (!isValidTCGCollectionKey(collectionKey)) return null;
  const normalizedCardId = normalizeCardId(cardId);
  const normalizedVariant = normalizeCollectionVariant(variant);
  const normalizedQuantity = normalizeStoredQuantity(quantity);
  return normalizedCardId && normalizedVariant && normalizedQuantity
    ? `${collectionKey}${TCG_COLLECTION_CARD_SEPARATOR}${normalizedCardId}${TCG_COLLECTION_CARD_SEPARATOR}${normalizedVariant}${TCG_COLLECTION_CARD_SEPARATOR}${normalizedQuantity}`
    : null;
}

export function getTCGCollectionCardIdentity(
  collectionKey: string,
  cardId: string,
  variant: TCGCollectionVariant,
): string | null {
  const token = encodeTCGCollectionCardKey(collectionKey, cardId, variant, 1);
  return token ? token.slice(0, token.lastIndexOf(TCG_COLLECTION_CARD_SEPARATOR)) : null;
}

export function decodeTCGCollectionCardKey(value: unknown): TCGCollectionCardOwnership | null {
  if (typeof value !== 'string') return null;
  const parts = value.split(TCG_COLLECTION_CARD_SEPARATOR);
  if (parts.length !== 2 && parts.length !== 4) return null;
  const collection = decodeTCGCollectionKey(parts[0]);
  const cardId = normalizeCardId(parts[1]);
  const variant = parts.length === 2 ? 'unspecified' : normalizeCollectionVariant(parts[2]);
  const quantity = parts.length === 2 ? 1 : normalizeStoredQuantity(Number(parts[3]));
  if (!collection || !cardId || !variant || !quantity) return null;
  const key = encodeTCGCollectionCardKey(collection.key, cardId, variant, quantity);
  if (!key) return null;
  return {
    key,
    collectionKey: collection.key,
    cardId,
    setId: collection.setId,
    language: collection.language,
    variant,
    quantity,
    modelVersion: TCG_COLLECTION_MODEL_VERSION,
  };
}

export function isValidTCGCollectionCardKey(value: unknown): value is string {
  return decodeTCGCollectionCardKey(value) !== null;
}

function normalizeTokenList(
  value: unknown,
  max: number | undefined,
  decoder: (entry: unknown) => string | null,
): string[] | null {
  if (!Array.isArray(value)) return null;
  if (typeof max === 'number' && (max < 0 || value.length > max)) return null;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const decoded = decoder(entry);
    if (!decoded) return null;
    if (!seen.has(decoded)) {
      seen.add(decoded);
      result.push(decoded);
    }
  }
  return result;
}

export function normalizeTCGCollectionKeys(value: unknown, max = Number.POSITIVE_INFINITY): string[] | null {
  return normalizeTokenList(value, max, (entry) => decodeTCGCollectionKey(entry)?.key ?? null);
}

/** Canonicalise v2 tokens and merge duplicate identity tokens by quantity. */
export function normalizeTCGCollectionCardKeys(
  value: unknown,
  max = Number.POSITIVE_INFINITY,
): string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const result: string[] = [];
  const byIdentity = new Map<string, { ownership: TCGCollectionCardOwnership; quantity: number }>();
  let physicalCount = 0;

  for (const entry of value) {
    const ownership = decodeTCGCollectionCardKey(entry);
    if (!ownership) return null;
    const identity = getTCGCollectionCardIdentity(ownership.collectionKey, ownership.cardId, ownership.variant);
    if (!identity) return null;
    const current = byIdentity.get(identity);
    const quantity = (current?.quantity ?? 0) + ownership.quantity;
    if (quantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return null;
    physicalCount += ownership.quantity;
    if (physicalCount > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return null;
    if (current) {
      current.quantity = quantity;
      current.ownership = {
        ...current.ownership,
        quantity,
        key: encodeTCGCollectionCardKey(current.ownership.collectionKey, current.ownership.cardId, current.ownership.variant, quantity)!,
      };
    } else {
      byIdentity.set(identity, { ownership, quantity: ownership.quantity });
      result.push(ownership.key);
    }
  }

  return result.map((entry) => {
    const ownership = decodeTCGCollectionCardKey(entry)!;
    const identity = getTCGCollectionCardIdentity(ownership.collectionKey, ownership.cardId, ownership.variant)!;
    return byIdentity.get(identity)!.ownership.key;
  });
}

/** Keep historical IDs intact; only validate, trim for comparison, and deduplicate. */
export function copyTCGLegacyOwnedCards(value: unknown, max = Number.POSITIVE_INFINITY): string[] {
  if (!Array.isArray(value) || (typeof max === 'number' && value.length > max)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string' || !normalizeLegacyCardId(entry)) return [];
    const key = entry.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }
  return result;
}

export function normalizeTCGLegacyOwnedCards(value: unknown, max = Number.POSITIVE_INFINITY): string[] | null {
  if (!Array.isArray(value) || (typeof max === 'number' && value.length > max)) return null;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string' || !normalizeLegacyCardId(entry)) return null;
    const key = entry.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }
  return result;
}

export function addTCGCollectionCard(
  collectionKey: string,
  cardId: string,
  current: readonly string[] = [],
): string[] {
  return setTCGCollectionVariantQuantity(collectionKey, cardId, 'unspecified', 1, current);
}

/** Remove every physical variant of one card in a collection. */
export function removeTCGCollectionCard(
  collectionKey: string,
  cardId: string,
  current: readonly string[] = [],
): string[] {
  const normalized = normalizeTCGCollectionCardKeys(current) ?? [];
  const normalizedCardId = normalizeCardId(cardId);
  return normalizedCardId
    ? normalized.filter((entry) => {
      const ownership = decodeTCGCollectionCardKey(entry);
      return ownership?.collectionKey !== collectionKey || ownership.cardId !== normalizedCardId;
    })
    : normalized;
}

/**
 * Move all physical cards from one language/set collection to another
 * language variant of the same set. Collection keys stay immutable; only the
 * card ownership tokens are re-keyed. Returning null means the keys are
 * invalid, refer to different sets, or the global physical cap would be
 * exceeded while merging an already-existing target collection.
 */
export function transferTCGCollectionCards(
  sourceCollectionKey: string,
  targetCollectionKey: string,
  current: readonly string[] = [],
): string[] | null {
  const source = decodeTCGCollectionKey(sourceCollectionKey);
  const target = decodeTCGCollectionKey(targetCollectionKey);
  const normalized = normalizeTCGCollectionCardKeys(current);
  if (!source || !target || !normalized || source.setId !== target.setId) return null;
  if (source.key === target.key) return normalized;

  const sourceCards = normalized
    .map((entry) => decodeTCGCollectionCardKey(entry))
    .filter((entry): entry is TCGCollectionCardOwnership => entry?.collectionKey === source.key);
  if (sourceCards.length === 0) return normalized;

  const targetCards = normalized
    .map((entry) => decodeTCGCollectionCardKey(entry))
    .filter((entry): entry is TCGCollectionCardOwnership => entry?.collectionKey === target.key);
  const untouched = normalized.filter((entry) => {
    const decoded = decodeTCGCollectionCardKey(entry);
    return decoded?.collectionKey !== source.key && decoded?.collectionKey !== target.key;
  });

  const merged = new Map<string, { cardId: string; variant: TCGCollectionVariant; quantity: number }>();
  const order: string[] = [];
  for (const ownership of [...targetCards, ...sourceCards]) {
    const identity = getTCGCollectionCardIdentity(target.key, ownership.cardId, ownership.variant);
    if (!identity) return null;
    const previous = merged.get(identity);
    const quantity = (previous?.quantity ?? 0) + ownership.quantity;
    if (quantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return null;
    if (previous) {
      previous.quantity = quantity;
    } else {
      merged.set(identity, { cardId: ownership.cardId, variant: ownership.variant, quantity });
      order.push(identity);
    }
  }

  const untouchedQuantity = untouched.reduce(
    (sum, entry) => sum + (decodeTCGCollectionCardKey(entry)?.quantity ?? 0),
    0,
  );
  const mergedQuantity = [...merged.values()].reduce((sum, entry) => sum + entry.quantity, 0);
  if (untouchedQuantity + mergedQuantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return null;

  const mergedTokens = order.map((identity) => {
    const ownership = merged.get(identity)!;
    return encodeTCGCollectionCardKey(target.key, ownership.cardId, ownership.variant, ownership.quantity)!;
  });
  return [...untouched, ...mergedTokens];
}

export function setTCGCollectionVariantQuantity(
  collectionKey: string,
  cardId: string,
  variant: TCGCollectionVariant,
  quantity: number,
  current: readonly string[] = [],
): string[] {
  const normalized = normalizeTCGCollectionCardKeys(current) ?? [];
  const identity = getTCGCollectionCardIdentity(collectionKey, cardId, variant);
  if (!identity || !Number.isInteger(quantity) || quantity < 0 || quantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return normalized;

  const withoutTarget = normalized.filter((entry) => {
    const ownership = decodeTCGCollectionCardKey(entry);
    return ownership ? getTCGCollectionCardIdentity(ownership.collectionKey, ownership.cardId, ownership.variant) !== identity : false;
  });
  if (quantity === 0) return withoutTarget;

  const otherQuantity = withoutTarget.reduce((sum, entry) => sum + (decodeTCGCollectionCardKey(entry)?.quantity ?? 0), 0);
  if (otherQuantity + quantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return normalized;
  const token = encodeTCGCollectionCardKey(collectionKey, cardId, variant, quantity);
  return token ? [...withoutTarget, token] : normalized;
}

/**
 * Adjust one physical finish from the current snapshot. Keeping the read and
 * write in one pure operation lets store actions apply +/- changes from the
 * latest state instead of from a rendered value that may already be stale.
 */
export function adjustTCGCollectionVariantQuantity(
  collectionKey: string,
  cardId: string,
  variant: TCGCollectionVariant,
  delta: number,
  current: readonly string[] = [],
): string[] {
  const normalized = normalizeTCGCollectionCardKeys(current) ?? [];
  if (!Number.isInteger(delta)) return normalized;
  const currentQuantity = getTCGCollectionCardQuantity(collectionKey, cardId, variant, normalized);
  const nextQuantity = currentQuantity + delta;
  if (nextQuantity < 0 || nextQuantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return normalized;
  return setTCGCollectionVariantQuantity(collectionKey, cardId, variant, nextQuantity, normalized);
}

/**
 * Qualify historical `unspecified` ownership using the first finish that
 * TCGdex explicitly reports. The promotion is returned as one pure snapshot
 * operation so callers can persist both identity changes together.
 */
export function qualifyTCGCollectionCardVariant(
  collectionKey: string,
  cardId: string,
  variant: TCGPhysicalVariant,
  current: readonly string[] = [],
): string[] {
  const normalized = normalizeTCGCollectionCardKeys(current) ?? [];
  const unspecifiedQuantity = getTCGCollectionCardQuantity(collectionKey, cardId, 'unspecified', normalized);
  if (unspecifiedQuantity <= 0) return normalized;

  const targetQuantity = getTCGCollectionCardQuantity(collectionKey, cardId, variant, normalized);
  const promoted = setTCGCollectionVariantQuantity(
    collectionKey,
    cardId,
    variant,
    targetQuantity + unspecifiedQuantity,
    normalized,
  );
  if (getTCGCollectionCardQuantity(collectionKey, cardId, variant, promoted) !== targetQuantity + unspecifiedQuantity) {
    return normalized;
  }
  return setTCGCollectionVariantQuantity(collectionKey, cardId, 'unspecified', 0, promoted);
}

export function getTCGCollectionCardOwnerships(
  collectionKey: string,
  cardKeys: readonly string[] = [],
): TCGCollectionCardOwnership[] {
  if (!isValidTCGCollectionKey(collectionKey)) return [];
  const result: TCGCollectionCardOwnership[] = [];
  for (const entry of normalizeTCGCollectionCardKeys(cardKeys) ?? []) {
    const decoded = decodeTCGCollectionCardKey(entry);
    if (decoded?.collectionKey === collectionKey) result.push(decoded);
  }
  return result;
}

export function getTCGCollectionCardQuantity(
  collectionKey: string,
  cardId: string,
  variant: TCGCollectionVariant,
  cardKeys: readonly string[] = [],
): number {
  const identity = getTCGCollectionCardIdentity(collectionKey, cardId, variant);
  if (!identity) return 0;
  return getTCGCollectionCardOwnerships(collectionKey, cardKeys)
    .find((entry) => getTCGCollectionCardIdentity(entry.collectionKey, entry.cardId, entry.variant) === identity)?.quantity ?? 0;
}

export function getTCGCollectionCardIds(
  collectionKey: string,
  cardKeys: readonly string[] = [],
): string[] {
  return [...new Set(getTCGCollectionCardOwnerships(collectionKey, cardKeys).map((entry) => entry.cardId))];
}

export function isTCGCollectionCardOwned(
  collectionKey: string,
  cardId: string,
  cardKeys: readonly string[] = [],
): boolean {
  const normalizedCardId = normalizeCardId(cardId);
  return Boolean(normalizedCardId && getTCGCollectionCardOwnerships(collectionKey, cardKeys).some((entry) => entry.cardId === normalizedCardId && entry.quantity > 0));
}

export function getTCGCollectionKeysForSet(collectionKeys: readonly string[], setId: string): string[] {
  const normalizedSetId = normalizeSetId(setId);
  if (!normalizedSetId) return [];
  return (normalizeTCGCollectionKeys(collectionKeys) ?? [])
    .filter((entry) => decodeTCGCollectionKey(entry)?.setId === normalizedSetId);
}

/** Rebuild the card-level compatibility index while keeping collection tokens language-specific. */
export function deriveTCGOwnedCardIds(
  collectionCards: readonly string[],
  legacyOwnedCards: readonly string[],
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of normalizeTCGCollectionCardKeys(collectionCards) ?? []) {
    const decoded = decodeTCGCollectionCardKey(entry);
    if (decoded && decoded.quantity > 0 && !seen.has(decoded.cardId)) {
      seen.add(decoded.cardId);
      result.push(decoded.cardId);
    }
  }
  for (const entry of copyTCGLegacyOwnedCards(legacyOwnedCards)) {
    const normalized = normalizeLegacyCardId(entry)?.toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

/** Count every physical possession, including quantities and language variants. */
export function countPhysicalTCGCards(
  collectionCards: readonly string[],
  legacyOwnedCards: readonly string[],
): number {
  const collectionCount = (normalizeTCGCollectionCardKeys(collectionCards) ?? [])
    .reduce((sum, entry) => sum + (decodeTCGCollectionCardKey(entry)?.quantity ?? 0), 0);
  return collectionCount + copyTCGLegacyOwnedCards(legacyOwnedCards).length;
}

export interface MigratedLegacyTCGOwnedCards {
  tcgLegacyOwnedCards: string[];
  tcgOwnedCards: string[];
  tcgCollections: string[];
  tcgCollectionCards: string[];
  tcgActiveCollections: string[];
  tcgBrowseLanguage: TCGCardLanguage;
  tcgCollectionModelVersion: typeof TCG_COLLECTION_MODEL_VERSION;
}

/** Upgrade a v1 snapshot without assigning a language to any historical card. */
export function migrateLegacyTCGOwnedCards(
  input: { tcgOwnedCards?: unknown; tcgLegacyOwnedCards?: unknown } | null | undefined,
): MigratedLegacyTCGOwnedCards {
  const suppliedLegacy = normalizeTCGLegacyOwnedCards(input?.tcgLegacyOwnedCards);
  const legacy = suppliedLegacy && suppliedLegacy.length > 0
    ? suppliedLegacy
    : copyTCGLegacyOwnedCards(input?.tcgOwnedCards);
  return {
    tcgLegacyOwnedCards: legacy,
    tcgOwnedCards: deriveTCGOwnedCardIds([], legacy),
    tcgCollections: [],
    tcgCollectionCards: [],
    tcgActiveCollections: [],
    tcgBrowseLanguage: DEFAULT_TCG_CARD_LANGUAGE,
    tcgCollectionModelVersion: TCG_COLLECTION_MODEL_VERSION,
  };
}

export function normalizeTCGCollectionState(
  state: Partial<TCGCollectionState> | null | undefined,
): TCGCollectionState {
  const modelVersion = (state as { tcgCollectionModelVersion?: unknown } | null | undefined)?.tcgCollectionModelVersion;
  const isExplicitV1 = modelVersion === 1;
  const hasLanguageAwareFields = !isExplicitV1 && (modelVersion === 2 || modelVersion === 3
    || (Array.isArray(state?.tcgLegacyOwnedCards) && state.tcgLegacyOwnedCards.length > 0)
    || (Array.isArray(state?.tcgCollections) && state.tcgCollections.length > 0)
    || (Array.isArray(state?.tcgCollectionCards) && state.tcgCollectionCards.length > 0)
    || (Array.isArray(state?.tcgActiveCollections) && state.tcgActiveCollections.length > 0));
  const collections = normalizeTCGCollectionKeys(state?.tcgCollections) ?? [];
  const collectionSet = new Set(collections);
  const collectionCards = (normalizeTCGCollectionCardKeys(state?.tcgCollectionCards) ?? [])
    .filter((entry) => {
      const decoded = decodeTCGCollectionCardKey(entry);
      return decoded !== null && collectionSet.has(decoded.collectionKey);
    });
  const activeCollections = (normalizeTCGCollectionKeys(state?.tcgActiveCollections) ?? [])
    .filter((entry) => collectionSet.has(entry));
  const legacy = isExplicitV1 || !hasLanguageAwareFields
    ? copyTCGLegacyOwnedCards(state?.tcgOwnedCards)
    : Object.prototype.hasOwnProperty.call(state ?? {}, 'tcgLegacyOwnedCards')
      ? normalizeTCGLegacyOwnedCards(state?.tcgLegacyOwnedCards) ?? []
      : [];
  const browseLanguage = normalizeTCGCardLanguage(state?.tcgBrowseLanguage) ?? DEFAULT_TCG_CARD_LANGUAGE;
  return {
    tcgCollections: collections,
    tcgCollectionCards: collectionCards,
    tcgActiveCollections: activeCollections,
    tcgLegacyOwnedCards: legacy,
    tcgOwnedCards: deriveTCGOwnedCardIds(collectionCards, legacy),
    tcgBrowseLanguage: browseLanguage,
    tcgCollectionModelVersion: TCG_COLLECTION_MODEL_VERSION,
  };
}

export function assignLegacyTCGSetToCollection(
  setId: string,
  language: TCGCardLanguage | string,
  legacyOwnedCards: readonly string[],
  collectionCards: readonly string[] = [],
): {
  collection: TCGCollection | null;
  tcgLegacyOwnedCards: string[];
  tcgCollectionCards: string[];
} {
  const collection = createTCGCollection(setId, language);
  if (!collection) {
    return {
      collection: null,
      tcgLegacyOwnedCards: [...legacyOwnedCards],
      tcgCollectionCards: [...collectionCards],
    };
  }
  const normalizedLegacy = copyTCGLegacyOwnedCards(legacyOwnedCards);
  const prefix = `${collection.setId}-`;
  let nextCollectionCards = normalizeTCGCollectionCardKeys(collectionCards) ?? [];
  const remainingLegacy: string[] = [];
  for (const entry of normalizedLegacy) {
    const normalizedEntry = entry.trim().toLowerCase();
    if (!normalizedEntry.startsWith(prefix) || !encodeTCGCollectionCardKey(collection.key, entry)) {
      remainingLegacy.push(entry);
      continue;
    }
    // A v1 card is one physical copy. Preserve it even when the card already
    // has an unspecified entry by increasing that entry's quantity. If the
    // global cap prevents the move, keep the historical ownership instead of
    // silently dropping it.
    const currentQuantity = getTCGCollectionCardQuantity(
      collection.key,
      entry,
      'unspecified',
      nextCollectionCards,
    );
    const next = setTCGCollectionVariantQuantity(
      collection.key,
      entry,
      'unspecified',
      currentQuantity + 1,
      nextCollectionCards,
    );
    if (getTCGCollectionCardQuantity(collection.key, entry, 'unspecified', next) === currentQuantity + 1) {
      nextCollectionCards = next;
    } else {
      remainingLegacy.push(entry);
    }
  }
  return {
    collection,
    tcgLegacyOwnedCards: remainingLegacy,
    tcgCollectionCards: nextCollectionCards,
  };
}

export { isTCGCardLanguage, normalizeTCGCardLanguage };
