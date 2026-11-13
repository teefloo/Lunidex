import { isTCGCardLanguage, type TCGCardLanguage } from './tcg-language';

export const TCG_CUSTOM_COLLECTION_NAME_MAX_LENGTH = 120;
export const TCG_CUSTOM_COLLECTION_DESCRIPTION_MAX_LENGTH = 2_000;
export const TCG_CUSTOM_COLLECTION_CARD_NAME_MAX_LENGTH = 160;
export const TCG_CUSTOM_COLLECTION_PAGE_SIZE = 48;
/** Keep binder ordering below the 2 MB whole-state sync request limit. */
export const TCG_CUSTOM_COLLECTION_LAYOUT_SYNC_BUDGET_BYTES = 1_500_000;

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

export type TCGCustomCollectionGridPreset = '2x2' | '3x3' | '4x3' | '4x4';

export interface TCGCustomCollectionLayoutCardRef {
  cardId: string;
  language: TCGCardLanguage;
  /** Zero-based identity of this physical copy; absent in pre-binder-layout data. */
  copyIndex?: number;
  /** Compact run length for adjacent copies. Omitted for an individually ordered pocket. */
  copyCount?: number;
}

/** Compact, user-owned ordering and grid preference for one custom binder. */
export interface TCGCustomCollectionLayout {
  collectionId: string;
  gridPreset: TCGCustomCollectionGridPreset;
  cardOrder: TCGCustomCollectionLayoutCardRef[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CARD_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i;
const MAX_CUSTOM_COLLECTION_CARD_COPIES = 9_999;

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

function isGridPreset(value: unknown): value is TCGCustomCollectionGridPreset {
  return value === '2x2' || value === '3x3' || value === '4x3' || value === '4x4';
}

function normalizeLayoutCardRef(value: unknown): TCGCustomCollectionLayoutCardRef | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const cardId = normalizeCardId(candidate.cardId);
  if (!cardId || !isTCGCardLanguage(candidate.language)) return null;
  const copyIndex = candidate.copyIndex === undefined ? 0 : candidate.copyIndex;
  const copyCount = candidate.copyCount === undefined ? 1 : candidate.copyCount;
  if (!Number.isSafeInteger(copyIndex) || (copyIndex as number) < 0
    || !Number.isSafeInteger(copyCount) || (copyCount as number) < 1
    || (copyIndex as number) + (copyCount as number) > MAX_CUSTOM_COLLECTION_CARD_COPIES) return null;
  return {
    cardId,
    language: candidate.language,
    copyIndex: copyIndex as number,
    ...((copyCount as number) > 1 ? { copyCount: copyCount as number } : {}),
  };
}

function getLayoutCardRefIdentity(card: TCGCustomCollectionLayoutCardRef): string {
  return `${card.language}\u001f${card.cardId}`;
}

function getLayoutCardRefCopyIndex(card: TCGCustomCollectionLayoutCardRef): number {
  return card.copyIndex ?? 0;
}

function getLayoutCardRefCopyCount(card: TCGCustomCollectionLayoutCardRef): number {
  return card.copyCount ?? 1;
}

function makeLayoutCardRef(
  card: Pick<TCGCustomCollectionLayoutCardRef, 'cardId' | 'language'>,
  copyIndex: number,
  copyCount = 1,
): TCGCustomCollectionLayoutCardRef {
  return {
    cardId: card.cardId,
    language: card.language,
    copyIndex,
    ...(copyCount > 1 ? { copyCount } : {}),
  };
}

/** Merge adjacent ascending copy ranges while keeping independently moved copies distinct. */
export function compressTCGCustomCollectionLayoutCardRefs(
  refs: readonly TCGCustomCollectionLayoutCardRef[],
): TCGCustomCollectionLayoutCardRef[] {
  const compressed: TCGCustomCollectionLayoutCardRef[] = [];
  for (const ref of refs) {
    const copyIndex = getLayoutCardRefCopyIndex(ref);
    const copyCount = getLayoutCardRefCopyCount(ref);
    const previous = compressed[compressed.length - 1];
    if (previous && getLayoutCardRefIdentity(previous) === getLayoutCardRefIdentity(ref)
      && getLayoutCardRefCopyIndex(previous) + getLayoutCardRefCopyCount(previous) === copyIndex) {
      compressed[compressed.length - 1] = makeLayoutCardRef(previous,
        getLayoutCardRefCopyIndex(previous), getLayoutCardRefCopyCount(previous) + copyCount);
    } else {
      compressed.push(makeLayoutCardRef(ref, copyIndex, copyCount));
    }
  }
  return compressed;
}

/** Number of physical binder pockets represented by compact layout runs. */
export function getTCGCustomCollectionLayoutCardCount(
  cardOrder: readonly TCGCustomCollectionLayoutCardRef[],
): number {
  return cardOrder.reduce((total, card) => total + getLayoutCardRefCopyCount(card), 0);
}

/** Reserve room for the rest of the user state in the whole-state sync payload. */
export function isTCGCustomCollectionLayoutWithinSyncBudget(
  layouts: readonly TCGCustomCollectionLayout[],
): boolean {
  // Layout IDs and language tags are ASCII after normalization, so JS string
  // length matches the serialized byte count for this compact payload.
  return JSON.stringify(layouts).length <= TCG_CUSTOM_COLLECTION_LAYOUT_SYNC_BUDGET_BYTES;
}

/** Find the physical position for one stable copy identity without expanding compact runs. */
export function getTCGCustomCollectionLayoutCardIndex(
  cardOrder: readonly TCGCustomCollectionLayoutCardRef[],
  target: TCGCustomCollectionLayoutCardRef,
): number {
  let position = 0;
  const targetCopyIndex = getLayoutCardRefCopyIndex(target);
  for (const card of cardOrder) {
    const count = getLayoutCardRefCopyCount(card);
    if (getLayoutCardRefIdentity(card) === getLayoutCardRefIdentity(target)
      && targetCopyIndex >= getLayoutCardRefCopyIndex(card)
      && targetCopyIndex < getLayoutCardRefCopyIndex(card) + count) {
      return position + targetCopyIndex - getLayoutCardRefCopyIndex(card);
    }
    position += count;
  }
  return -1;
}

function splitLayoutCardRefsAt(
  cardOrder: readonly TCGCustomCollectionLayoutCardRef[],
  requestedIndex: number,
): [TCGCustomCollectionLayoutCardRef[], TCGCustomCollectionLayoutCardRef[]] {
  let remainingIndex = Math.max(0, requestedIndex);
  const before: TCGCustomCollectionLayoutCardRef[] = [];
  const after: TCGCustomCollectionLayoutCardRef[] = [];
  let didSplit = false;

  for (const card of cardOrder) {
    const copyIndex = getLayoutCardRefCopyIndex(card);
    const copyCount = getLayoutCardRefCopyCount(card);
    if (didSplit) {
      after.push(makeLayoutCardRef(card, copyIndex, copyCount));
    } else if (remainingIndex >= copyCount) {
      before.push(makeLayoutCardRef(card, copyIndex, copyCount));
      remainingIndex -= copyCount;
    } else {
      if (remainingIndex > 0) before.push(makeLayoutCardRef(card, copyIndex, remainingIndex));
      const afterCount = copyCount - remainingIndex;
      if (afterCount > 0) after.push(makeLayoutCardRef(card, copyIndex + remainingIndex, afterCount));
      didSplit = true;
      remainingIndex = 0;
    }
  }
  return [before, after];
}

/** Move one physical copy while leaving the rest of the compact order untouched. */
export function moveTCGCustomCollectionLayoutCard(
  cardOrder: readonly TCGCustomCollectionLayoutCardRef[],
  movingCard: TCGCustomCollectionLayoutCardRef,
  requestedIndex: number,
): { cardOrder: TCGCustomCollectionLayoutCardRef[]; sourceIndex: number; destinationIndex: number } | null {
  const sourceIndex = getTCGCustomCollectionLayoutCardIndex(cardOrder, movingCard);
  const totalCards = getTCGCustomCollectionLayoutCardCount(cardOrder);
  if (sourceIndex < 0 || totalCards < 1) return null;
  const destinationIndex = Math.max(0, Math.min(Math.trunc(requestedIndex), totalCards - 1));
  if (sourceIndex === destinationIndex) {
    return { cardOrder: cardOrder.map((card) => makeLayoutCardRef(card, getLayoutCardRefCopyIndex(card), getLayoutCardRefCopyCount(card))), sourceIndex, destinationIndex };
  }

  const [prefix, afterSource] = splitLayoutCardRefsAt(cardOrder, sourceIndex);
  const [movingRun, suffix] = splitLayoutCardRefsAt(afterSource, 1);
  const movingCopy = movingRun[0];
  if (!movingCopy) return null;
  const remaining = compressTCGCustomCollectionLayoutCardRefs([...prefix, ...suffix]);
  const [beforeDestination, afterDestination] = splitLayoutCardRefsAt(remaining, destinationIndex);
  return {
    cardOrder: compressTCGCustomCollectionLayoutCardRefs([
      ...beforeDestination,
      makeLayoutCardRef(movingCopy, getLayoutCardRefCopyIndex(movingCopy)),
      ...afterDestination,
    ]),
    sourceIndex,
    destinationIndex,
  };
}

function getLayoutPageCardSlots(
  cardOrder: readonly TCGCustomCollectionLayoutCardRef[],
  start: number,
  capacity: number,
): TCGCustomCollectionLayoutCardRef[] {
  const slots: TCGCustomCollectionLayoutCardRef[] = [];
  let skipped = 0;
  for (const card of cardOrder) {
    const runCount = getLayoutCardRefCopyCount(card);
    if (skipped + runCount <= start) {
      skipped += runCount;
      continue;
    }
    const firstCopyOffset = Math.max(0, start - skipped);
    const takeCount = Math.min(runCount - firstCopyOffset, capacity - slots.length);
    for (let offset = 0; offset < takeCount; offset += 1) {
      slots.push(makeLayoutCardRef(card, getLayoutCardRefCopyIndex(card) + firstCopyOffset + offset));
    }
    skipped += runCount;
    if (slots.length >= capacity) break;
  }
  return slots;
}

export function normalizeTCGCustomCollectionLayouts(
  value: unknown,
  collectionIds: Iterable<string>,
  cards: readonly TCGCustomCollectionCard[],
): TCGCustomCollectionLayout[] | null {
  // Callers provide canonical collection/card IDs and cards in collection addition order. New members follow
  // membership order; missing copies are inserted beside their last saved slot.
  if (!Array.isArray(value)) return null;

  const validCollectionIds = new Set(
    [...collectionIds].filter(isUuid).map((collectionId) => collectionId.toLowerCase()),
  );
  const layoutsByCollectionId = new Set<string>();
  const normalizedLayouts: TCGCustomCollectionLayout[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const candidate = entry as Record<string, unknown>;
    if (!isUuid(candidate.collectionId) || !isGridPreset(candidate.gridPreset) || !Array.isArray(candidate.cardOrder)) {
      return null;
    }

    const collectionId = candidate.collectionId.toLowerCase();
    if (!validCollectionIds.has(collectionId) || layoutsByCollectionId.has(collectionId)) return null;
    layoutsByCollectionId.add(collectionId);

    const explicitOrder: TCGCustomCollectionLayoutCardRef[] = [];
    const rangesByIdentity = new Map<string, Array<{ start: number; end: number }>>();
    for (const rawRef of candidate.cardOrder) {
      const cardRef = normalizeLayoutCardRef(rawRef);
      if (!cardRef) return null;
      explicitOrder.push(cardRef);
    }

    const membersInAdditionOrder = cards.filter((card) => card.collectionId === collectionId);
    const membersByIdentity = new Map(membersInAdditionOrder.map((card) => [getLayoutCardRefIdentity(card), card]));
    const orderedMembers: TCGCustomCollectionLayoutCardRef[] = [];

    for (const cardRef of explicitOrder) {
      const identity = getLayoutCardRefIdentity(cardRef);
      const member = membersByIdentity.get(identity);
      if (!member) continue;
      const desiredCopies = Math.max(1, member.quantity ?? 1);
      const copyIndex = getLayoutCardRefCopyIndex(cardRef);
      if (copyIndex >= desiredCopies) continue;
      const copyCount = Math.min(getLayoutCardRefCopyCount(cardRef), desiredCopies - copyIndex);
      const ranges = rangesByIdentity.get(identity) ?? [];
      const end = copyIndex + copyCount;
      if (ranges.some((range) => copyIndex < range.end && end > range.start)) return null;
      ranges.push({ start: copyIndex, end });
      rangesByIdentity.set(identity, ranges);
      orderedMembers.push(makeLayoutCardRef(cardRef, copyIndex, copyCount));
    }

    for (const member of membersInAdditionOrder) {
      const identity = getLayoutCardRefIdentity(member);
      const desiredCopies = Math.max(1, member.quantity ?? 1);
      const ranges = (rangesByIdentity.get(identity) ?? []).sort((left, right) => left.start - right.start);
      const missingRuns: TCGCustomCollectionLayoutCardRef[] = [];
      let nextMissingIndex = 0;
      for (const range of ranges) {
        if (range.start > nextMissingIndex) missingRuns.push(makeLayoutCardRef(member, nextMissingIndex, range.start - nextMissingIndex));
        nextMissingIndex = Math.max(nextMissingIndex, range.end);
      }
      if (nextMissingIndex < desiredCopies) {
        missingRuns.push(makeLayoutCardRef(member, nextMissingIndex, desiredCopies - nextMissingIndex));
      }
      if (missingRuns.length === 0) continue;

      let lastMemberIndex = -1;
      for (let index = 0; index < orderedMembers.length; index += 1) {
        if (getLayoutCardRefIdentity(orderedMembers[index]) === identity) lastMemberIndex = index;
      }
      if (lastMemberIndex < 0) orderedMembers.push(...missingRuns);
      else orderedMembers.splice(lastMemberIndex + 1, 0, ...missingRuns);
    }

    normalizedLayouts.push({
      collectionId,
      gridPreset: candidate.gridPreset,
      cardOrder: compressTCGCustomCollectionLayoutCardRefs(orderedMembers),
    });
  }

  return normalizedLayouts.sort((left, right) => left.collectionId.localeCompare(right.collectionId));
}

export function getTCGCustomCollectionLayout(
  collectionId: string,
  layouts: readonly TCGCustomCollectionLayout[],
  cards: readonly TCGCustomCollectionCard[],
): TCGCustomCollectionLayout {
  const existingLayout = layouts.find((layout) => layout.collectionId === collectionId);
  if (existingLayout) return existingLayout;

  return {
    collectionId,
    gridPreset: '3x3',
    cardOrder: compressTCGCustomCollectionLayoutCardRefs(cards
      .filter((card) => card.collectionId === collectionId)
      .map((card) => makeLayoutCardRef(card, 0, Math.max(1, card.quantity ?? 1)))),
  };
}

export function getTCGCustomCollectionGridDimensions(
  preset: TCGCustomCollectionGridPreset,
): { columns: number; rows: number; capacity: number } {
  switch (preset) {
    case '2x2':
      return { columns: 2, rows: 2, capacity: 4 };
    case '3x3':
      return { columns: 3, rows: 3, capacity: 9 };
    case '4x3':
      return { columns: 4, rows: 3, capacity: 12 };
    case '4x4':
      return { columns: 4, rows: 4, capacity: 16 };
  }
}

export function getTCGCustomCollectionLayoutPage(
  layout: TCGCustomCollectionLayout,
  page: number,
): {
  page: number;
  pageCount: number;
  capacity: number;
  totalCards: number;
  cardOrder: TCGCustomCollectionLayoutCardRef[];
  emptySlots: number;
} {
  const { capacity } = getTCGCustomCollectionGridDimensions(layout.gridPreset);
  const totalCards = getTCGCustomCollectionLayoutCardCount(layout.cardOrder);
  const pageCount = Math.max(1, Math.ceil(totalCards / capacity));
  const safeRequestedPage = Number.isSafeInteger(page) ? page : 1;
  const boundedPage = Math.min(pageCount, Math.max(1, safeRequestedPage));
  const start = (boundedPage - 1) * capacity;
  const cardOrder = getLayoutPageCardSlots(layout.cardOrder, start, capacity);

  return {
    page: boundedPage,
    pageCount,
    capacity,
    totalCards,
    cardOrder,
    emptySlots: capacity - cardOrder.length,
  };
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
