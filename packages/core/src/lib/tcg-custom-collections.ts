import { isTCGCardLanguage, type TCGCardLanguage } from './tcg-language';

export const TCG_CUSTOM_COLLECTION_NAME_MAX_LENGTH = 120;
export const TCG_CUSTOM_COLLECTION_DESCRIPTION_MAX_LENGTH = 2_000;
export const TCG_CUSTOM_COLLECTION_CARD_NAME_MAX_LENGTH = 160;
export const TCG_CUSTOM_COLLECTION_PAGE_SIZE = 48;

export interface TCGCustomCollection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/** A compact, independent reference to one catalogue printing in one binder. */
export interface TCGCustomCollectionCard {
  collectionId: string;
  cardId: string;
  language: TCGCardLanguage;
  cardName: string;
  addedAt: string;
  /** Missing in legacy snapshots; interpreted as one binder copy. Zero keeps a wanted card. */
  quantity?: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CARD_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i;

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function normalizeCardId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').trim().toLowerCase();
  return normalized.length > 0 && normalized.length <= 128 && CARD_ID_PATTERN.test(normalized)
    ? normalized
    : null;
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function normalizeTCGCustomCollection(value: unknown): TCGCustomCollection | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (!isUuid(candidate.id)) return null;
  if (typeof candidate.name !== 'string') return null;
  const name = candidate.name.normalize('NFKC').trim();
  if (!name || name.length > TCG_CUSTOM_COLLECTION_NAME_MAX_LENGTH) return null;
  const createdAt = normalizeTimestamp(candidate.createdAt);
  const updatedAt = normalizeTimestamp(candidate.updatedAt);
  if (!createdAt || !updatedAt) return null;
  if (candidate.description !== undefined && typeof candidate.description !== 'string') return null;
  const description = typeof candidate.description === 'string'
    ? candidate.description.normalize('NFKC').trim()
    : '';
  if (description.length > TCG_CUSTOM_COLLECTION_DESCRIPTION_MAX_LENGTH) return null;
  return {
    id: candidate.id.toLowerCase(),
    name,
    ...(description ? { description } : {}),
    createdAt,
    updatedAt,
  };
}

export function createTCGCustomCollection(
  id: string,
  name: string,
  description: string,
  createdAt: string,
): TCGCustomCollection | null {
  return normalizeTCGCustomCollection({ id, name, description, createdAt, updatedAt: createdAt });
}

export function editTCGCustomCollection(
  collectionId: string,
  changes: Pick<TCGCustomCollection, 'name' | 'description'>,
  updatedAt: string,
  collections: readonly TCGCustomCollection[],
): TCGCustomCollection[] | null {
  const current = collections.find((collection) => collection.id === collectionId);
  if (!current) return null;
  const updated = normalizeTCGCustomCollection({
    ...current,
    ...changes,
    updatedAt,
  });
  if (!updated) return null;
  return collections.map((collection) => collection.id === collectionId ? updated : collection);
}

export function normalizeTCGCustomCollections(value: unknown): TCGCustomCollection[] | null {
  if (!Array.isArray(value)) return null;
  const byId = new Map<string, TCGCustomCollection>();
  for (const entry of value) {
    const collection = normalizeTCGCustomCollection(entry);
    if (!collection) return null;
    const current = byId.get(collection.id);
    if (!current || collection.updatedAt >= current.updatedAt) byId.set(collection.id, collection);
  }
  return [...byId.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
}

export function getTCGCustomCollectionCardIdentity(
  collectionId: string,
  cardId: string,
  language: TCGCardLanguage,
): string {
  return `${collectionId}\u001f${language}\u001f${cardId}`;
}

export function normalizeTCGCustomCollectionCard(value: unknown): TCGCustomCollectionCard | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (!isUuid(candidate.collectionId) || !isTCGCardLanguage(candidate.language)) return null;
  const cardId = normalizeCardId(candidate.cardId);
  if (!cardId) return null;
  if (typeof candidate.cardName !== 'string') return null;
  const cardName = candidate.cardName.normalize('NFKC').trim();
  if (!cardName || cardName.length > TCG_CUSTOM_COLLECTION_CARD_NAME_MAX_LENGTH) return null;
  const quantity = candidate.quantity === undefined ? 1 : candidate.quantity;
  if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 9_999) return null;
  const addedAt = normalizeTimestamp(candidate.addedAt);
  if (!addedAt) return null;
  return {
    collectionId: candidate.collectionId.toLowerCase(),
    cardId,
    language: candidate.language,
    cardName,
    addedAt,
    quantity,
  };
}

export function normalizeTCGCustomCollectionCards(
  value: unknown,
  collectionIds: Iterable<string>,
): TCGCustomCollectionCard[] | null {
  if (!Array.isArray(value)) return null;
  const validCollections = new Set(collectionIds);
  const unique = new Map<string, TCGCustomCollectionCard>();
  for (const entry of value) {
    const card = normalizeTCGCustomCollectionCard(entry);
    if (!card || !validCollections.has(card.collectionId)) return null;
    const identity = getTCGCustomCollectionCardIdentity(card.collectionId, card.cardId, card.language);
    if (!unique.has(identity)) unique.set(identity, card);
  }
  return [...unique.values()].sort((left, right) =>
    left.addedAt.localeCompare(right.addedAt)
    || left.collectionId.localeCompare(right.collectionId)
    || left.cardId.localeCompare(right.cardId)
    || left.language.localeCompare(right.language));
}

export function addTCGCustomCollectionCard(
  collections: readonly TCGCustomCollection[],
  cards: readonly TCGCustomCollectionCard[],
  value: unknown,
): TCGCustomCollectionCard[] {
  const card = normalizeTCGCustomCollectionCard(value);
  if (!card || !collections.some((collection) => collection.id === card.collectionId)) return [...cards];
  const identity = getTCGCustomCollectionCardIdentity(card.collectionId, card.cardId, card.language);
  if (cards.some((entry) => getTCGCustomCollectionCardIdentity(entry.collectionId, entry.cardId, entry.language) === identity)) {
    return [...cards];
  }
  return [...cards, card].sort((left, right) =>
    left.addedAt.localeCompare(right.addedAt)
    || left.collectionId.localeCompare(right.collectionId)
    || left.cardId.localeCompare(right.cardId)
    || left.language.localeCompare(right.language));
}

export function removeTCGCustomCollectionCard(
  collectionId: string,
  cardId: string,
  language: TCGCardLanguage,
  cards: readonly TCGCustomCollectionCard[],
): TCGCustomCollectionCard[] {
  return cards.filter((card) =>
    card.collectionId !== collectionId || card.cardId !== cardId || card.language !== language);
}

function searchText(value: string): string {
  return value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
}

export interface TCGCustomCollectionCardPage {
  items: TCGCustomCollectionCard[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export function filterTCGCustomCollectionCards(
  cards: readonly TCGCustomCollectionCard[],
  searchTerm: string,
  page: number,
  pageSize = TCG_CUSTOM_COLLECTION_PAGE_SIZE,
): TCGCustomCollectionCardPage {
  const normalizedQuery = searchText(searchTerm.trim());
  const matches = normalizedQuery
    ? cards.filter((card) => searchText(`${card.cardName} ${card.cardId} ${card.language}`).includes(normalizedQuery))
    : [...cards];
  const safePageSize = Number.isSafeInteger(pageSize) ? Math.max(1, pageSize) : TCG_CUSTOM_COLLECTION_PAGE_SIZE;
  const safePage = Number.isSafeInteger(page) ? Math.max(1, page) : 1;
  const start = (safePage - 1) * safePageSize;
  return {
    items: matches.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total: matches.length,
    hasNextPage: start + safePageSize < matches.length,
  };
}
