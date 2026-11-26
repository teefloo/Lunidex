import {
  countPhysicalTCGCards,
  decodeTCGCollectionCardKey,
  decodeTCGCollectionKey,
  deriveTCGOwnedCardIds,
  encodeTCGCollectionKey,
  getTCGCollectionCardQuantity,
  isTCGCardLanguage,
  MAX_TCG_COLLECTION_PHYSICAL_CARDS,
  normalizeTCGCollectionQuantity,
  normalizeTCGCollectionCardKeys,
  normalizeTCGCollectionKeys,
  setTCGCollectionVariantQuantity,
  TCG_PHYSICAL_VARIANTS,
  type TCGCollectionVariant,
} from '@primedex/core/lib/tcg-collections';
import { normalizeTCGCardLanguage } from '@primedex/core/lib/tcg-language';
import { normalizeTcgCardId } from '@/lib/tcg-owned-cards';
import { getTCGCardCached } from '@/lib/api/server-cache';
import type { NeonSql } from '@/lib/neon/server';
import { normalizeUserStateData } from '@/lib/tcg-owned-cards';
import { advanceTcgApiSyncMetadata, attachTcgApiSyncMetadata, type TcgApiState } from '@/lib/tcg-api-sync';
import { apiError } from '@/lib/public-api';

const MODEL_VERSION = 3;

interface UserStateRow {
  data: unknown;
  updated_at: string;
}

export interface CardHolding {
  cardId: string;
  collectionKey?: string;
  setId: string | null;
  language: string | null;
  variant: TCGCollectionVariant;
  quantity: number;
  legacy?: boolean;
}

export interface CardSnapshot {
  state: TcgApiState;
  metadata: unknown;
  updatedAt: string | null;
}

export class PublicCardError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'PublicCardError';
  }
}

function jsonObject(value: unknown): TcgApiState {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as TcgApiState : {};
}

function toNormalizedState(raw: unknown): TcgApiState {
  const input = jsonObject(raw);
  const normalized = normalizeUserStateData(input);
  if (!normalized) throw new PublicCardError(500, 'INVALID_SAVED_STATE', 'The saved collection state is invalid.');
  const state = normalized as TcgApiState;
  return {
    ...state,
    tcgOwnedCards: Array.isArray(state.tcgOwnedCards) ? state.tcgOwnedCards : [],
    tcgLegacyOwnedCards: Array.isArray(state.tcgLegacyOwnedCards) ? state.tcgLegacyOwnedCards : [],
    tcgCollections: Array.isArray(state.tcgCollections) ? state.tcgCollections : [],
    tcgCollectionCards: Array.isArray(state.tcgCollectionCards) ? state.tcgCollectionCards : [],
    tcgActiveCollections: Array.isArray(state.tcgActiveCollections) ? state.tcgActiveCollections : [],
    tcgCollectionModelVersion: MODEL_VERSION,
  };
}

export async function getCardSnapshot(sql: NeonSql, userId: string): Promise<CardSnapshot> {
  const rows = await sql`
    select data, updated_at::text as updated_at
    from public.user_state
    where user_id = ${userId}::uuid
    limit 1
  ` as UserStateRow[];
  const row = rows[0];
  const data = jsonObject(row?.data);
  return {
    state: toNormalizedState(data),
    metadata: data.__sync,
    updatedAt: row?.updated_at ?? null,
  };
}

export function listCardHoldings(
  state: TcgApiState,
  filters: { language?: string; setId?: string } = {},
): CardHolding[] {
  const collectionKeys = new Set(normalizeTCGCollectionKeys(state.tcgCollections) ?? []);
  const collectionCards = normalizeTCGCollectionCardKeys(state.tcgCollectionCards) ?? [];
  const result: CardHolding[] = [];
  for (const token of collectionCards) {
    const ownership = decodeTCGCollectionCardKey(token);
    if (!ownership || !collectionKeys.has(ownership.collectionKey)) continue;
    if (filters.language && ownership.language !== filters.language) continue;
    if (filters.setId && ownership.setId !== filters.setId) continue;
    result.push({
      cardId: ownership.cardId,
      collectionKey: ownership.collectionKey,
      setId: ownership.setId,
      language: ownership.language,
      variant: ownership.variant,
      quantity: ownership.quantity,
    });
  }

  const legacy = Array.isArray(state.tcgLegacyOwnedCards) ? state.tcgLegacyOwnedCards : [];
  if (!filters.language && !filters.setId) {
    const normalizedIds = new Set(result.map((entry) => entry.cardId.toLowerCase()));
    for (const cardId of legacy) {
      if (typeof cardId !== 'string' || normalizedIds.has(cardId.toLowerCase())) continue;
      result.push({
        cardId,
        setId: null,
        language: null,
        variant: 'unspecified',
        quantity: 1,
        legacy: true,
      });
    }
  }
  return result.sort((left, right) => (
    left.cardId.localeCompare(right.cardId)
    || (left.language ?? '').localeCompare(right.language ?? '')
    || left.variant.localeCompare(right.variant)
    || (left.collectionKey ?? '').localeCompare(right.collectionKey ?? '')
  ));
}

export function publicCardProjection(card: NonNullable<Awaited<ReturnType<typeof getTCGCardCached>>>) {
  return {
    id: card.id,
    localId: card.localId,
    name: card.name,
    category: card.category ?? null,
    rarity: card.rarity ?? null,
    image: card.image ?? card.imageUrl ?? null,
    set: card.set ? { id: card.set.id, name: card.set.name, cardCount: card.set.cardCount ?? null } : null,
    variants: card.variants ?? null,
    number: card.number ?? null,
    illustrator: card.illustrator ?? null,
  };
}

export interface SetCardHoldingInput {
  cardId: unknown;
  language: unknown;
  variant: unknown;
  quantity: unknown;
}

export async function setCardHolding(
  sql: NeonSql,
  userId: string,
  keyId: string,
  input: SetCardHoldingInput,
): Promise<{ holding: CardHolding; updatedAt: string }> {
  if (typeof input.cardId !== 'string' || typeof input.language !== 'string') {
    throw new PublicCardError(422, 'VALIDATION_ERROR', 'cardId and language are required.');
  }
  const language = normalizeTCGCardLanguage(input.language);
  if (!language || !isTCGCardLanguage(language)) {
    throw new PublicCardError(422, 'VALIDATION_ERROR', 'The TCG language is invalid.');
  }
  const variant = input.variant;
  if (variant !== 'unspecified' && !(TCG_PHYSICAL_VARIANTS as readonly unknown[]).includes(variant)) {
    throw new PublicCardError(422, 'VALIDATION_ERROR', 'The card variant is invalid.');
  }
  const quantity = normalizeTCGCollectionQuantity(input.quantity);
  if (quantity === null) {
    throw new PublicCardError(422, 'VALIDATION_ERROR', `Quantity must be an integer between 0 and ${MAX_TCG_COLLECTION_PHYSICAL_CARDS}.`);
  }
  const cardId = normalizeTcgCardId(input.cardId);
  if (!cardId) {
    throw new PublicCardError(422, 'VALIDATION_ERROR', 'The TCG card id is invalid.');
  }

  const card = quantity > 0 ? await getTCGCardCached(cardId, language) : null;
  if (quantity > 0 && !card) {
    throw new PublicCardError(502, 'CARD_DATA_UNAVAILABLE', 'Card data could not be verified.');
  }
  if (card && !card.set?.id) {
    throw new PublicCardError(422, 'INVALID_CARD', 'The card does not belong to a valid set.');
  }
  if (card && variant !== 'unspecified' && card.variants?.[variant as keyof NonNullable<typeof card.variants>] !== true) {
    throw new PublicCardError(422, 'VARIANT_UNAVAILABLE', 'This variant is not available for the card.');
  }
  const setId = card?.set?.id;
  const fetchedCollectionKey = setId ? encodeTCGCollectionKey(language, setId) : null;
  if (card && !fetchedCollectionKey) throw new PublicCardError(422, 'INVALID_CARD', 'The card set id is invalid.');

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await getCardSnapshot(sql, userId);
    const previous = current.state;
    const oldCollectionCards = normalizeTCGCollectionCardKeys(previous.tcgCollectionCards) ?? [];
    const oldLegacy = Array.isArray(previous.tcgLegacyOwnedCards)
      ? previous.tcgLegacyOwnedCards.filter((entry): entry is string => typeof entry === 'string')
      : [];
    const oldCollections = normalizeTCGCollectionKeys(previous.tcgCollections) ?? [];
    const oldActive = normalizeTCGCollectionKeys(previous.tcgActiveCollections) ?? [];
    const matchingOwnerships = oldCollectionCards.flatMap((token) => {
      const ownership = decodeTCGCollectionCardKey(token);
      return ownership?.cardId === cardId && ownership.language === language && ownership.variant === variant
        ? [ownership]
        : [];
    });
    const existingCollectionKeys = [...new Set(matchingOwnerships.map((ownership) => ownership.collectionKey))];
    if (existingCollectionKeys.length > 1) {
      throw new PublicCardError(409, 'AMBIGUOUS_OWNERSHIP', 'This card exists in more than one collection for the selected language.');
    }
    const collectionKey = fetchedCollectionKey ?? existingCollectionKeys[0] ?? null;
    const setIdForHolding = setId ?? (collectionKey ? decodeTCGCollectionKey(collectionKey)?.setId ?? null : null);
    const ownedQuantity = collectionKey
      ? getTCGCollectionCardQuantity(collectionKey, cardId, variant as TCGCollectionVariant, oldCollectionCards)
      : 0;
    const legacyWillBeRemoved = oldLegacy.some((entry) => entry.trim().toLowerCase() === cardId);
    const resultingPhysicalCount = countPhysicalTCGCards(oldCollectionCards, oldLegacy)
      - ownedQuantity
      - (legacyWillBeRemoved ? 1 : 0)
      + quantity;
    if (quantity > 0 && resultingPhysicalCount > MAX_TCG_COLLECTION_PHYSICAL_CARDS) {
      throw new PublicCardError(422, 'COLLECTION_LIMIT_REACHED', 'The collection is at its 10000-card limit.');
    }

    let nextCollectionCards = oldCollectionCards;
    // API writes are authoritative for this card id: a legacy possession has
    // no language or variant to distinguish, so any absolute update either
    // migrates it into v3 (quantity > 0) or removes it (quantity = 0).
    const nextLegacy = oldLegacy.filter((entry) => entry.trim().toLowerCase() !== cardId);
    let nextCollections = oldCollections;
    let nextActive = oldActive;
    if (collectionKey) {
      nextCollectionCards = setTCGCollectionVariantQuantity(
        collectionKey,
        cardId,
        variant as TCGCollectionVariant,
        quantity,
        oldCollectionCards,
      );
      if (getTCGCollectionCardQuantity(collectionKey, cardId, variant as TCGCollectionVariant, nextCollectionCards) !== quantity) {
        throw new PublicCardError(422, 'COLLECTION_LIMIT_REACHED', 'The card quantity exceeds the collection limit.');
      }
      if (quantity > 0 && !nextCollections.includes(collectionKey)) nextCollections = [...nextCollections, collectionKey];
      const hasCardsInCollection = nextCollectionCards.some((token) => decodeTCGCollectionCardKey(token)?.collectionKey === collectionKey);
      nextActive = hasCardsInCollection
        ? nextActive.includes(collectionKey) ? nextActive : [...nextActive, collectionKey]
        : nextActive.filter((entry) => entry !== collectionKey);
    }
    const next: TcgApiState = {
      ...previous,
      tcgCollectionCards: nextCollectionCards,
      tcgLegacyOwnedCards: nextLegacy,
      tcgCollections: nextCollections,
      tcgActiveCollections: nextActive,
      tcgOwnedCards: deriveTCGOwnedCardIds(nextCollectionCards, nextLegacy),
      tcgCollectionModelVersion: MODEL_VERSION,
    };
    const normalized = normalizeUserStateData(next);
    if (!normalized) throw new PublicCardError(422, 'INVALID_COLLECTION', 'The updated collection is invalid.');

    const sameState = JSON.stringify(previous.tcgCollectionCards) === JSON.stringify(normalized.tcgCollectionCards)
      && JSON.stringify(previous.tcgCollections) === JSON.stringify(normalized.tcgCollections)
      && JSON.stringify(previous.tcgActiveCollections) === JSON.stringify(normalized.tcgActiveCollections)
      && JSON.stringify(previous.tcgLegacyOwnedCards) === JSON.stringify(normalized.tcgLegacyOwnedCards)
      && JSON.stringify(previous.tcgOwnedCards) === JSON.stringify(normalized.tcgOwnedCards);
    if (sameState) {
      const holding = collectionKey
        ? listCardHoldings(normalized, {}).find((entry) => entry.collectionKey === collectionKey && entry.cardId === cardId && entry.variant === variant)
        : undefined;
      if (quantity === 0) {
        return {
          holding: {
            cardId,
            collectionKey: collectionKey ?? undefined,
            setId: setIdForHolding,
            language,
            variant: variant as TCGCollectionVariant,
            quantity: 0,
          },
          updatedAt: current.updatedAt ?? new Date().toISOString(),
        };
      }
      if (holding) return { holding, updatedAt: current.updatedAt ?? new Date().toISOString() };
    }

    const metadata = advanceTcgApiSyncMetadata(
      current.metadata,
      previous,
      normalized,
      `api:${keyId}`,
    );
    const nextData = attachTcgApiSyncMetadata(normalized, metadata);
    const serialized = JSON.stringify(nextData);
    let updatedRows: UserStateRow[];
    if (current.updatedAt === null) {
      updatedRows = await sql`
        insert into public.user_state (user_id, data)
        values (${userId}::uuid, ${serialized}::jsonb)
        on conflict (user_id) do nothing
        returning data, updated_at::text as updated_at
      ` as UserStateRow[];
    } else {
      updatedRows = await sql`
        update public.user_state
        set data = ${serialized}::jsonb
        where user_id = ${userId}::uuid
          and updated_at = ${current.updatedAt}::timestamptz
        returning data, updated_at::text as updated_at
      ` as UserStateRow[];
    }
    if (updatedRows[0]) {
      const holding = collectionKey
        ? listCardHoldings(normalized, {}).find((entry) => entry.collectionKey === collectionKey && entry.cardId === cardId && entry.variant === variant)
        : undefined;
      return {
        holding: holding ?? {
          cardId,
          collectionKey: collectionKey ?? undefined,
          setId: setIdForHolding,
          language,
          variant: variant as TCGCollectionVariant,
          quantity: 0,
        },
        updatedAt: updatedRows[0].updated_at,
      };
    }
  }
  throw new PublicCardError(409, 'STATE_CONFLICT', 'The collection changed concurrently. Retry the request.');
}

export function cardErrorResponse(error: unknown) {
  if (error instanceof PublicCardError) return apiError(error.status, error.code, error.message);
  return apiError(500, 'INTERNAL_ERROR', 'The card collection request failed.');
}

export function isSupportedCollectionLanguage(value: string): boolean {
  return normalizeTCGCardLanguage(value) !== null;
}
