import { decodeTCGCollectionCardKey, getTCGCollectionCardIdentity } from '@/lib/tcg-collections';
import type { PostHogProperties } from '@/lib/posthog-events';

/** Compare accepted snapshots, never optimistic state or hydration. No card IDs leave this function. */
export function getPersistedTcgAddition(previous: readonly string[], saved: readonly string[], requested: readonly string[] = saved): PostHogProperties | undefined {
  const quantities = new Map<string, number>();
  for (const token of previous) {
    const card = decodeTCGCollectionCardKey(token);
    if (card) quantities.set(getTCGCollectionCardIdentity(card.collectionKey, card.cardId, card.variant)!, card.quantity);
  }
  const requestedKeys = new Set(requested);
  for (const token of saved) {
    if (!requestedKeys.has(token)) continue;
    const card = decodeTCGCollectionCardKey(token);
    if (card && card.quantity > (quantities.get(getTCGCollectionCardIdentity(card.collectionKey, card.cardId, card.variant)!) ?? 0)) {
      return { set_id: card.setId, tcg_language: card.language };
    }
  }
}

interface PersistedTcgCollection {
  tcgCollectionCards: readonly string[];
  tcgLegacyOwnedCards?: readonly string[];
  tcgOwnedCards?: readonly string[];
}
export function getFirstPersistedTcgValue(previous: PersistedTcgCollection, saved: readonly string[], requested: readonly string[]): PostHogProperties | undefined {
  if (previous.tcgCollectionCards.length || previous.tcgLegacyOwnedCards?.length || previous.tcgOwnedCards?.length) return;
  return getPersistedTcgAddition(previous.tcgCollectionCards, saved, requested);
}
