import { getCanonicalTcgRarity } from '@/lib/tcg-rarity';
import type { TCGCard, TCGSet } from '@/types/tcg';

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
