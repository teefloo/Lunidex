import { getCanonicalTcgRarity } from '@/lib/tcg-rarity';
import type {
  TCGCard,
  TCGCardValue,
  TCGCollectionCard,
  TCGSet,
} from '@/types/tcg';

export function countOwnedInSet(setId: string, ownedIds: Set<string>): number {
  const prefix = `${setId}-`;
  let count = 0;
  for (const id of ownedIds) {
    if (id.startsWith(prefix)) count++;
  }
  return count;
}

export function getSetCompletionFromSet(
  set: TCGSet,
  ownedIds: Set<string>,
): { owned: number; total: number; percentage: number } {
  const total = set.totalCards ?? set.cardCount?.total ?? 0;
  const owned = countOwnedInSet(set.id, ownedIds);
  return {
    owned,
    total,
    percentage: total > 0 ? Math.round((owned / total) * 100) : 0,
  };
}

export function computeCollectionStatsFromSets(
  sets: TCGSet[],
  ownedIds: Set<string>,
) {
  let totalCards = 0;
  let totalOwned = 0;
  const completeSets: string[] = [];

  for (const set of sets) {
    const total = set.totalCards ?? set.cardCount?.total ?? 0;
    const owned = countOwnedInSet(set.id, ownedIds);
    totalCards += total;
    totalOwned += owned;
    if (owned === total && total > 0) {
      completeSets.push(set.id);
    }
  }

  return {
    totalCards,
    totalOwned,
    totalSets: sets.length,
    completeSets,
    percentage: totalCards > 0 ? Math.round((totalOwned / totalCards) * 100) : 0,
  };
}

const RARITY_WEIGHTS: Record<string, number> = {
  hyperrare: 100,
  secretrare: 90,
  specialillustrationrare: 85,
  ultrarare: 80,
  illustrationrare: 75,
  doublerare: 70,
  rareholovstar: 68,
  rareholovmax: 65,
  rareholov: 60,
  rarerainbow: 55,
  rareholo: 50,
  rarersecret: 45,
  amazingrare: 40,
  radiantrare: 35,
  trainergallery: 30,
  rare: 25,
  reverseholo: 20,
  promo: 15,
  uncommon: 10,
  common: 5,
};

export function getRarityWeight(rarity?: string | null): number {
  const key = getCanonicalTcgRarity(rarity);
  return RARITY_WEIGHTS[key] ?? 0;
}

export function getRarityColor(rarity?: string | null): string {
  const weight = getRarityWeight(rarity);
  if (weight >= 80) return 'text-amber-300';
  if (weight >= 60) return 'text-rose-400';
  if (weight >= 40) return 'text-violet-400';
  if (weight >= 20) return 'text-blue-400';
  if (weight >= 10) return 'text-emerald-400';
  return 'text-foreground/40';
}

export function getRarityLabel(rarity?: string | null): string {
  const key = getCanonicalTcgRarity(rarity);
  const labels: Record<string, string> = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    doublerare: 'Double Rare',
    ultrarare: 'Ultra Rare',
    illustrationrare: 'Illustration Rare',
    specialillustrationrare: 'Special Illustration Rare',
    hyperrare: 'Hyper Rare',
    secretrare: 'Secret Rare',
    rareholo: 'Rare Holo',
    rareholov: 'Rare Holo V',
    rareholovmax: 'Rare Holo VMAX',
    rareholovstar: 'Rare Holo VSTAR',
    rarehologx: 'Rare Holo GX',
    rarerainbow: 'Rainbow Rare',
    raresecret: 'Secret Rare',
    amazingrare: 'Amazing Rare',
    radiantrare: 'Radiant Rare',
    trainergallery: 'Trainer Gallery',
    reverseholo: 'Reverse Holo',
    promo: 'Promo',
  };
  return labels[key] ?? rarity ?? 'Unknown';
}

export function sortByRarityWeight(cards: TCGCard[]): TCGCard[] {
  return [...cards].sort((a, b) => {
    const wa = getRarityWeight(a.rarity);
    const wb = getRarityWeight(b.rarity);
    if (wb !== wa) return wb - wa;
    return a.name.localeCompare(b.name);
  });
}

export function getSetCompletion(
  cards: TCGCard[],
  ownedIds: Set<string>,
): { owned: number; total: number; percentage: number } {
  const total = cards.length;
  const owned = cards.filter((c) => ownedIds.has(c.id)).length;
  return {
    owned,
    total,
    percentage: total > 0 ? Math.round((owned / total) * 100) : 0,
  };
}

export function getCompletionByRarity(
  cards: TCGCard[],
  ownedIds: Set<string>,
): { rarity: string; owned: number; total: number; percentage: number; weight: number }[] {
  const groups = new Map<string, TCGCard[]>();
  for (const card of cards) {
    const key = getCanonicalTcgRarity(card.rarity) || 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(card);
  }
  return [...groups.entries()]
    .map(([rarity, group]) => {
      const owned = group.filter((c) => ownedIds.has(c.id)).length;
      return {
        rarity,
        owned,
        total: group.length,
        percentage: Math.round((owned / group.length) * 100),
        weight: getRarityWeight(rarity),
      };
    })
    .sort((a, b) => b.weight - a.weight);
}

export function getMissingCardsInSet(
  cards: TCGCard[],
  ownedIds: Set<string>,
): TCGCard[] {
  return cards.filter((c) => !ownedIds.has(c.id));
}

export function sortCardsByNumber(cards: TCGCard[]): TCGCard[] {
  return [...cards].sort((a, b) => {
    const na = parseInt(a.localId, 10);
    const nb = parseInt(b.localId, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localId.localeCompare(b.localId);
  });
}

export function getRarestOwnedCards(
  setsMap: Map<string, { set: TCGSet; cards: TCGCard[] }>,
  ownedIds: Set<string>,
  limit = 12,
): TCGCard[] {
  const collection: TCGCard[] = [];
  for (const [, { cards }] of setsMap) {
    for (const card of cards) {
      if (ownedIds.has(card.id)) {
        collection.push(card);
      }
    }
  }
  return sortByRarityWeight(collection).slice(0, limit);
}

export function computeCollectionStats(
  setsMap: Map<string, { set: TCGSet; cards: TCGCard[] }>,
  ownedIds: Set<string>,
) {
  let totalCards = 0;
  let totalOwned = 0;
  let totalSets = 0;
  const completeSets: string[] = [];

  for (const [setId, { cards }] of setsMap) {
    totalSets++;
    totalCards += cards.length;
    const owned = cards.filter((c) => ownedIds.has(c.id)).length;
    totalOwned += owned;
    if (owned === cards.length) {
      completeSets.push(setId);
    }
  }

  return {
    totalCards,
    totalOwned,
    totalSets,
    completeSets,
    percentage: totalCards > 0 ? Math.round((totalOwned / totalCards) * 100) : 0,
  };
}

export function getWishlistSuggestions(
  setsMap: Map<string, { set: TCGSet; cards: TCGCard[] }>,
  ownedIds: Set<string>,
  activeSetIds: string[],
): TCGCard[] {
  const suggestions: TCGCard[] = [];
  for (const setId of activeSetIds) {
    const entry = setsMap.get(setId);
    if (!entry) continue;
    for (const card of entry.cards) {
      if (!ownedIds.has(card.id)) {
        suggestions.push(card);
      }
    }
  }
  return sortByRarityWeight(suggestions);
}

export function formatWishlistForExport(
  cards: TCGCard[],
): string {
  return cards
    .map((c) => `#${c.localId} ${c.name} — ${c.set?.name ?? ''} (${c.rarity ?? '?'})`)
    .join('\n');
}

export function formatWishlistCopyPaste(cards: TCGCard[]): string {
  return cards
    .map((c) => `${c.name} #${c.localId} [${c.set?.name ?? ''}]`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Valuation
//
// TCGdex exposes prices on the card *detail* endpoint only (not the bulk set
// listing): `pricing.cardmarket` (EUR) and `pricing.tcgplayer.<variant>` (USD).
// We prefer Cardmarket because the app's primary audience is European and the
// EUR figures are a single scalar per card; TCGplayer is used as a fallback for
// cards Cardmarket does not cover. Because the two providers use different
// currencies we never sum across them — `aggregateCollectionValue` groups totals
// per currency so the displayed estimate stays honest.
//
// Extension point: to add another price source, populate `card.pricing` in
// `normaliseCard` (src/lib/api/tcg.ts) and extend `getCardMarketValue` below.
// ---------------------------------------------------------------------------

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Resolve a single representative market value for a card.
 * Prefers Cardmarket trend → average → low (EUR), then falls back to the most
 * relevant TCGplayer variant market/mid/low price (USD). Returns null when no
 * price is available (e.g. summary cards that were never hydrated).
 */
export function getCardMarketValue(card: TCGCard): TCGCardValue | null {
  const cardmarket = card.pricing?.cardmarket;
  if (cardmarket) {
    const amount =
      toFiniteNumber(cardmarket.trend) ??
      toFiniteNumber(cardmarket.avg) ??
      toFiniteNumber(cardmarket.avg30) ??
      toFiniteNumber(cardmarket.low);
    if (typeof amount === 'number') {
      return { amount, currency: cardmarket.unit || 'EUR' };
    }
  }

  const tcgplayer = card.pricing?.tcgplayer;
  if (tcgplayer) {
    const currency = tcgplayer.unit || 'USD';
    for (const variant of ['normal', 'holofoil', 'reverse-holofoil'] as const) {
      const tier = tcgplayer[variant];
      if (tier && typeof tier === 'object') {
        const amount =
          toFiniteNumber(tier.marketPrice) ??
          toFiniteNumber(tier.midPrice) ??
          toFiniteNumber(tier.lowPrice);
        if (typeof amount === 'number') return { amount, currency };
      }
    }
  }

  return null;
}

/**
 * Project a hydrated card into the slim, owned-independent shape consumed by the
 * collection statistics UI.
 */
export function toCollectionCard(card: TCGCard): TCGCollectionCard {
  return {
    id: card.id,
    localId: card.localId,
    name: card.name,
    image: card.image ?? card.imageUrl,
    rarity: card.rarity ?? null,
    value: getCardMarketValue(card),
  };
}

export function getCollectionCardRarityWeight(card: TCGCollectionCard): number {
  return getRarityWeight(card.rarity);
}

export function sortCollectionCardsByRarity(
  cards: TCGCollectionCard[],
): TCGCollectionCard[] {
  return [...cards].sort((a, b) => {
    const wa = getCollectionCardRarityWeight(a);
    const wb = getCollectionCardRarityWeight(b);
    if (wb !== wa) return wb - wa;
    return a.name.localeCompare(b.name);
  });
}

export function getSetCompletionFromCards(
  cards: TCGCollectionCard[],
  ownedIds: Set<string>,
): { owned: number; total: number; percentage: number } {
  const total = cards.length;
  let owned = 0;
  for (const card of cards) {
    if (ownedIds.has(card.id)) owned++;
  }
  return {
    owned,
    total,
    percentage: total > 0 ? Math.round((owned / total) * 100) : 0,
  };
}

/**
 * Return the rarest cards of a set that are not yet owned, highest rarity first.
 * Guaranteed to contain only non-owned cards.
 */
export function getTopMissingCards(
  cards: TCGCollectionCard[],
  ownedIds: Set<string>,
  limit = 8,
): TCGCollectionCard[] {
  const safeLimit = Math.max(0, Math.floor(limit));
  if (safeLimit === 0) return [];
  const missing = cards.filter((card) => !ownedIds.has(card.id));
  return sortCollectionCardsByRarity(missing).slice(0, safeLimit);
}

export interface TCGCollectionValueGroup {
  currency: string;
  total: number;
  count: number;
}

export interface TCGCollectionValuation {
  /** Per-currency totals for owned cards that have a price. Sorted by total desc. */
  groups: TCGCollectionValueGroup[];
  /** Number of owned cards present in `cards`. */
  ownedCount: number;
  /** Number of owned cards that contributed a price to `groups`. */
  pricedCount: number;
}

/**
 * Aggregate the estimated value of the owned subset of `cards`, grouped by
 * currency. Pure and allocation-light so it stays fast on large sets when
 * memoised by the caller.
 */
export function aggregateCollectionValue(
  cards: TCGCollectionCard[],
  ownedIds: Set<string>,
): TCGCollectionValuation {
  const totals = new Map<string, { total: number; count: number }>();
  let ownedCount = 0;
  let pricedCount = 0;

  for (const card of cards) {
    if (!ownedIds.has(card.id)) continue;
    ownedCount++;
    const value = card.value;
    if (!value || !Number.isFinite(value.amount)) continue;
    pricedCount++;
    const entry = totals.get(value.currency) ?? { total: 0, count: 0 };
    entry.total += value.amount;
    entry.count++;
    totals.set(value.currency, entry);
  }

  const groups = [...totals.entries()]
    .map(([currency, { total, count }]) => ({
      currency,
      total: Math.round(total * 100) / 100,
      count,
    }))
    .sort((a, b) => b.total - a.total);

  return { groups, ownedCount, pricedCount };
}

export interface TCGActiveSetInsights {
  completion: { owned: number; total: number; percentage: number };
  topMissing: TCGCollectionCard[];
  valuation: TCGCollectionValuation;
  /** Estimated total value of the full set (all cards, owned or not). */
  setTotalValue: TCGCollectionValueGroup[];
}

/**
 * Keep the progress indicator truthful while card-level set details are
 * unavailable. The set metadata still gives us a reliable total and the
 * compact owned IDs let us calculate the owned count without claiming that
 * an empty response means the set is complete.
 */
export function getActiveSetInsightsFallback(
  set: TCGSet,
  ownedIds: Set<string>,
): TCGActiveSetInsights {
  const completion = getSetCompletionFromSet(set, ownedIds);
  return {
    completion,
    topMissing: [],
    valuation: {
      groups: [],
      ownedCount: completion.owned,
      pricedCount: 0,
    },
    setTotalValue: [],
  };
}

/**
 * Aggregate the estimated value of ALL cards in a set (ownership-independent).
 * Useful as a "set worth" reference even when the user owns 0 cards.
 */
export function aggregateSetTotalValue(
  cards: TCGCollectionCard[],
): TCGCollectionValueGroup[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const card of cards) {
    const value = card.value;
    if (!value || !Number.isFinite(value.amount)) continue;
    const entry = totals.get(value.currency) ?? { total: 0, count: 0 };
    entry.total += value.amount;
    entry.count++;
    totals.set(value.currency, entry);
  }
  return [...totals.entries()]
    .map(([currency, { total, count }]) => ({
      currency,
      total: Math.round(total * 100) / 100,
      count,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Compute the full insight payload for one active set from its hydrated cards.
 */
export function computeActiveSetInsights(
  cards: TCGCollectionCard[],
  ownedIds: Set<string>,
  topMissingLimit = 8,
): TCGActiveSetInsights {
  return {
    completion: getSetCompletionFromCards(cards, ownedIds),
    topMissing: getTopMissingCards(cards, ownedIds, topMissingLimit),
    valuation: aggregateCollectionValue(cards, ownedIds),
    setTotalValue: aggregateSetTotalValue(cards),
  };
}
