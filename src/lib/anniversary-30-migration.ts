import {
  ANNIVERSARY_30_PIKACHU_SLOTS,
  type Anniversary30PikachuSlotId,
} from '@/lib/anniversary-30';
import { decodeTCGCollectionKey } from '@/lib/tcg-collections';

const LEGACY_SLOT_IDS = new Set<string>(ANNIVERSARY_30_PIKACHU_SLOTS.map((slot) => slot.id));
const CARD_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i;

export interface LegacyAnniversary30Progress {
  checkedSlotIds: string[];
  preservedSlotIds: string[];
}

export interface Anniversary30MigrationState {
  version: 2;
  sourceVersion: 1;
  sourceSlotIds: string[];
  migratedCardIds: string[];
  pendingSlotIds: string[];
  preservedSlotIds: string[];
}

export interface Anniversary30MigrationPlan {
  status: 'ready' | 'pending-auth' | 'pending-identity' | 'empty';
  cardIdsToAdd: string[];
  pendingSlotIds: string[];
  preservedSlotIds: string[];
  serializedState: string;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) return null;
  return uniqueStrings(value as string[]);
}

function isValidCardId(value: unknown): value is string {
  return typeof value === 'string' && CARD_ID_PATTERN.test(value.trim());
}

/** Parse the historical v1 local snapshot without mutating localStorage. */
export function parseLegacyAnniversary30Progress(value: string | null): LegacyAnniversary30Progress {
  if (!value) return { checkedSlotIds: [], preservedSlotIds: [] };

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return { checkedSlotIds: [], preservedSlotIds: [] };

    const candidate = parsed as { version?: unknown; checkedSlotIds?: unknown };
    if (candidate.version !== 1 || !Array.isArray(candidate.checkedSlotIds)) {
      return { checkedSlotIds: [], preservedSlotIds: [] };
    }

    const checkedSlotIds: string[] = [];
    const preservedSlotIds: string[] = [];
    for (const entry of candidate.checkedSlotIds) {
      if (typeof entry !== 'string') continue;
      const slotId = entry.trim();
      if (!slotId) continue;
      if (LEGACY_SLOT_IDS.has(slotId)) {
        if (!checkedSlotIds.includes(slotId)) checkedSlotIds.push(slotId);
      } else if (!preservedSlotIds.includes(slotId)) {
        preservedSlotIds.push(slotId);
      }
    }

    return { checkedSlotIds, preservedSlotIds };
  } catch {
    return { checkedSlotIds: [], preservedSlotIds: [] };
  }
}

export function createAnniversary30MigrationState(input: {
  sourceSlotIds: readonly string[];
  migratedCardIds: readonly string[];
  pendingSlotIds: readonly string[];
  preservedSlotIds: readonly string[];
}): Anniversary30MigrationState {
  return {
    version: 2,
    sourceVersion: 1,
    sourceSlotIds: uniqueStrings(input.sourceSlotIds),
    migratedCardIds: uniqueStrings(input.migratedCardIds),
    pendingSlotIds: uniqueStrings(input.pendingSlotIds),
    preservedSlotIds: uniqueStrings(input.preservedSlotIds),
  };
}

export function parseAnniversary30MigrationState(value: string | null | undefined): Anniversary30MigrationState | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Partial<Anniversary30MigrationState>;
    const sourceSlotIds = readStringArray(candidate.sourceSlotIds);
    const migratedCardIds = readStringArray(candidate.migratedCardIds);
    const pendingSlotIds = readStringArray(candidate.pendingSlotIds);
    const preservedSlotIds = readStringArray(candidate.preservedSlotIds);
    if (
      candidate.version !== 2
      || candidate.sourceVersion !== 1
      || !sourceSlotIds
      || !migratedCardIds
      || !pendingSlotIds
      || !preservedSlotIds
    ) return null;

    return createAnniversary30MigrationState({
      sourceSlotIds,
      migratedCardIds,
      pendingSlotIds,
      preservedSlotIds,
    });
  } catch {
    return null;
  }
}

export function serializeAnniversary30MigrationState(state: Anniversary30MigrationState): string {
  return JSON.stringify(state);
}

export function getAnniversary30MigrationPlan(
  values: { legacyValue: string | null; stateValue?: string | null },
  input: {
    collectionKey?: string;
    cardIdBySlot: ReadonlyMap<string, string>;
    alreadyOwnedCardIds: readonly string[];
  },
): Anniversary30MigrationPlan {
  const legacy = parseLegacyAnniversary30Progress(values.legacyValue);
  const previous = parseAnniversary30MigrationState(values.stateValue);
  const sourceSlotIds = legacy.checkedSlotIds.length > 0
    ? legacy.checkedSlotIds
    : previous?.sourceSlotIds ?? [];
  const preservedSlotIds = uniqueStrings([
    ...(previous?.preservedSlotIds ?? []),
    ...legacy.preservedSlotIds,
  ]);
  const migratedCardIds = new Set(previous?.migratedCardIds ?? []);
  const validCollectionKey = Boolean(input.collectionKey && decodeTCGCollectionKey(input.collectionKey));
  const pendingSlotIds: string[] = [];
  const cardIdsToAdd: string[] = [];
  const alreadyOwned = new Set(input.alreadyOwnedCardIds);

  for (const slotId of sourceSlotIds) {
    const candidateCardId = input.cardIdBySlot.get(slotId);
    if (!isValidCardId(candidateCardId)) {
      pendingSlotIds.push(slotId);
      continue;
    }

    const cardId = candidateCardId.trim();
    if (validCollectionKey && !alreadyOwned.has(cardId) && !migratedCardIds.has(cardId)) {
      if (!cardIdsToAdd.includes(cardId)) cardIdsToAdd.push(cardId);
    }
  }

  const nextMigratedCardIds = uniqueStrings([
    ...(previous?.migratedCardIds ?? []),
    ...cardIdsToAdd,
  ]);
  const state = createAnniversary30MigrationState({
    sourceSlotIds,
    migratedCardIds: nextMigratedCardIds,
    pendingSlotIds,
    preservedSlotIds,
  });

  return {
    status: sourceSlotIds.length === 0
      ? 'empty'
      : !validCollectionKey
        ? 'pending-auth'
        : pendingSlotIds.length > 0
          ? 'pending-identity'
          : 'ready',
    cardIdsToAdd,
    pendingSlotIds,
    preservedSlotIds,
    serializedState: serializeAnniversary30MigrationState(state),
  };
}

export function getAnniversary30CardIdByLegacySlot(
  cards: readonly { id: string; pikachuNumber?: number }[],
): ReadonlyMap<Anniversary30PikachuSlotId, string> {
  return new Map(
    cards
      .filter((card): card is { id: string; pikachuNumber: number } => typeof card.pikachuNumber === 'number')
      .map((card) => [
        `pikachu-rare-${String(card.pikachuNumber).padStart(2, '0')}` as Anniversary30PikachuSlotId,
        card.id,
      ] as const),
  );
}
