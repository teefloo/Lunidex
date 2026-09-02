import { getCanonicalTcgRarity } from '@/lib/tcg-rarity';
import type {
  TCGCard,
  TCGCardPricing,
  TCGCardVariantDetailed,
  TCGCardValue,
  TCGCollectionCard,
  TCGSet,
} from '@/types/tcg';
import {
  TCG_DEFAULT_VARIANT_ORDER,
  TCG_PHYSICAL_VARIANTS,
  normalizeTCGCollectionQuantity,
  type TCGCollectionVariant,
  type TCGPhysicalVariant,
} from '@primedex/core/lib/tcg-collections';
import type { TCGDisplayCurrency } from '@/lib/tcg-currency';

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
// Newer detail responses also expose `variants_detailed`, whose pricing block
// belongs to one concrete printing. Prefer that block whenever it exists; the
// legacy top-level pricing object can represent a different printing than the
// one selected by the user. Because the two providers use different currencies
// we never sum or convert across them — callers can pass the user's selected
// display currency to keep only matching source quotes.
//
// Extension point: to add another price source, populate `card.pricing` in
// `normaliseCard` (src/lib/api/tcg.ts) and extend `getCardMarketValue` below.
// ---------------------------------------------------------------------------

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Market quotes must be strictly positive. TCGdex currently emits `0` for
 * unavailable Cardmarket foil fields, so accepting zero would turn an
 * expensive holo card into a free card in the collection total.
 */
function toUsableMarketNumber(value: unknown): number | undefined {
  const amount = toFiniteNumber(value);
  return typeof amount === 'number' && amount > 0 ? amount : undefined;
}

function getCardmarketBaseAmount(cardmarket: TCGCardPricing['cardmarket'] | null): number | undefined {
  if (!cardmarket) return undefined;
  return toUsableMarketNumber(cardmarket.trend)
    ?? toUsableMarketNumber(cardmarket.avg)
    ?? toUsableMarketNumber(cardmarket.avg30)
    ?? toUsableMarketNumber(cardmarket.avg7)
    ?? toUsableMarketNumber(cardmarket.avg1)
    ?? toUsableMarketNumber(cardmarket.low);
}

function getCardmarketHoloAmount(cardmarket: TCGCardPricing['cardmarket'] | null): number | undefined {
  if (!cardmarket) return undefined;
  return toUsableMarketNumber(cardmarket['trend-holo'])
    ?? toUsableMarketNumber(cardmarket['avg-holo'])
    ?? toUsableMarketNumber(cardmarket['avg30-holo'])
    ?? toUsableMarketNumber(cardmarket['avg7-holo'])
    ?? toUsableMarketNumber(cardmarket['avg1-holo'])
    ?? toUsableMarketNumber(cardmarket['low-holo']);
}

function normalizeCurrency(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const normalized = value.trim().toUpperCase();
  if (normalized === '€') return 'EUR';
  if (normalized === '$') return 'USD';
  return normalized;
}

function normalizeDetailedVariantType(value: unknown): TCGPhysicalVariant | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized === 'normal') return 'normal';
  if (normalized === 'reverse' || normalized === 'reverseholo' || normalized === 'reverseholofoil') return 'reverse';
  if (normalized === 'holo' || normalized === 'holofoil') return 'holo';
  return null;
}

/**
 * Return the standard detail for a physical variant. TCGdex can list an
 * additional stamped/foil printing beside the standard one; the collection
 * model does not distinguish those sub-variants, so prefer the unmarked entry
 * when one is available.
 */
function getDetailedVariants(
  card: TCGCard,
  variant: TCGPhysicalVariant,
): TCGCardVariantDetailed[] {
  const detailedVariants = Array.isArray(card.variants_detailed) ? card.variants_detailed : [];
  const matches = detailedVariants.filter(
    (entry) => entry && normalizeDetailedVariantType(entry.type) === variant,
  );
  const standardMatches = matches.filter((entry) => !entry.stamp && !entry.foil);
  return standardMatches.length > 0 ? standardMatches : matches;
}

function getTCGPlayerTiers(
  tcgplayer: NonNullable<TCGCardPricing['tcgplayer']>,
  variant: TCGPhysicalVariant,
) {
  return variant === 'normal'
    ? [tcgplayer.normal]
    : variant === 'holo'
      ? [tcgplayer.holofoil, tcgplayer.holo]
      : [tcgplayer.reverse, tcgplayer['reverse-holofoil']];
}

function resolveValueFromPricing(
  pricing: TCGCardPricing | null | undefined,
  variant: TCGPhysicalVariant,
  displayCurrency: TCGDisplayCurrency | undefined,
  useDetailedHoloPrice = false,
  allowTopLevelHoloBaseFallback = false,
): TCGCardValue | null {
  const cardmarket = pricing?.cardmarket;
  const cardmarketAmount = variant === 'normal'
    ? getCardmarketBaseAmount(cardmarket)
    : variant === 'holo'
      ? useDetailedHoloPrice
        ? getCardmarketBaseAmount(cardmarket) ?? getCardmarketHoloAmount(cardmarket)
        : getCardmarketHoloAmount(cardmarket)
          ?? (allowTopLevelHoloBaseFallback ? getCardmarketBaseAmount(cardmarket) : undefined)
      : undefined;

  if (typeof cardmarketAmount === 'number') {
    const value = { amount: cardmarketAmount, currency: normalizeCurrency(cardmarket?.unit, 'EUR') };
    if (!displayCurrency || value.currency === displayCurrency) return value;
  }

  const tcgplayer = pricing?.tcgplayer;
  if (tcgplayer) {
    const currency = normalizeCurrency(tcgplayer.unit, 'USD');
    for (const tier of getTCGPlayerTiers(tcgplayer, variant)) {
      if (!tier || typeof tier !== 'object') continue;
      const amount = toUsableMarketNumber(tier.marketPrice)
        ?? toUsableMarketNumber(tier.midPrice)
        ?? toUsableMarketNumber(tier.lowPrice);
      if (typeof amount === 'number' && (!displayCurrency || currency === displayCurrency)) {
        return { amount, currency };
      }
    }
  }

  return null;
}

/**
 * Resolve the exact market value for one physical variant. Cardmarket exposes
 * non-foil and foil prices, while TCGplayer exposes Normal, Holofoil and
 * Reverse-Holofoil separately. Reverse therefore never falls back to an
 * ambiguous Cardmarket foil value.
 */
export function getTCGVariantValue(
  card: TCGCard,
  variant: TCGPhysicalVariant,
  displayCurrency?: TCGDisplayCurrency,
): TCGCardValue | null {
  // TCGdex may omit variant metadata on summary/legacy payloads. Treat that
  // as unknown rather than inventing a physical finish from a provider price.
  if (card.variants?.[variant] !== true) return null;
  const detailedVariants = getDetailedVariants(card, variant);
  if (detailedVariants.length > 0) {
    for (const detailedVariant of detailedVariants) {
      const value = resolveValueFromPricing(
        detailedVariant.pricing,
        variant,
        displayCurrency,
        true,
      );
      if (value) return value;
    }
    // A matching detailed entry is authoritative even when its providers have
    // no quote. Do not silently substitute a price for another printing from
    // the legacy top-level block.
    return null;
  }

  return resolveValueFromPricing(card.pricing, variant, displayCurrency, false, card.variants?.normal === false);
}

/**
 * Resolve the legacy single price shown outside variant-aware collection UI.
 *
 * The old collection model had no finish information and intentionally used
 * whichever marketplace quote was available. Preserve that behavior for
 * representative estimates. This fallback never applies to an explicitly
 * selected variant.
 */
export function getCardMarketValue(card: TCGCard, displayCurrency?: TCGDisplayCurrency): TCGCardValue | null {
  // When TCGdex tells us which physical finishes exist, resolve the first
  // available finish in the same deterministic order used when qualifying a
  // historical possession. This prevents a holo-only card from inheriting a
  // non-foil Cardmarket quote.
  if (card.variants) {
    const declaredVariants = TCG_DEFAULT_VARIANT_ORDER.filter((variant) => card.variants?.[variant] === true);
    for (const variant of declaredVariants) {
      const value = getTCGVariantValue(card, variant, displayCurrency);
      if (value) return value;
    }
    if (declaredVariants.length > 0) return null;
  }

  // Summary/legacy payloads without variant metadata still need a
  // representative estimate for catalogue views. This path is deliberately
  // not used when an explicit physical variant is available above.
  for (const variant of TCG_DEFAULT_VARIANT_ORDER) {
    const value = resolveValueFromPricing(card.pricing, variant, displayCurrency);
    if (value) return value;
  }

  return null;
}

/** Keep a resolved source quote only when it matches the user's display currency. */
export function getTCGValueInCurrency(
  value: TCGCardValue | null | undefined,
  displayCurrency?: TCGDisplayCurrency,
): TCGCardValue | null {
  if (!value || !Number.isFinite(value.amount) || value.amount <= 0 || typeof value.currency !== 'string') return null;
  const currency = normalizeCurrency(value.currency, '');
  return !displayCurrency || currency === displayCurrency
    ? { ...value, currency: currency || value.currency }
    : null;
}

/**
 * Project a hydrated card into the slim, owned-independent shape consumed by the
 * collection statistics UI.
 */
export function toCollectionCard(
  card: TCGCard,
  fallbackSetId?: string,
  displayCurrency?: TCGDisplayCurrency,
): TCGCollectionCard {
  const variants = card.variants ?? null;
  const variantValues = {
    // A missing flag is not evidence that a physical finish exists. Keep the
    // card-level price available to catalogue views, but only expose exact
    // variant prices when TCGdex explicitly marks that finish as present.
    normal: variants?.normal === true ? getTCGVariantValue(card, 'normal', displayCurrency) : null,
    reverse: variants?.reverse === true ? getTCGVariantValue(card, 'reverse', displayCurrency) : null,
    holo: variants?.holo === true ? getTCGVariantValue(card, 'holo', displayCurrency) : null,
  } satisfies Partial<Record<TCGPhysicalVariant, TCGCardValue | null>>;
  return {
    id: card.id,
    localId: card.localId,
    name: card.name,
    setId: fallbackSetId ?? card.set?.id ?? '',
    image: card.image ?? card.imageUrl,
    rarity: card.rarity ?? null,
    variants,
    variantValues,
    value: getCardMarketValue(card, displayCurrency),
  };
}

/**
 * Read an exact finish quote from a collection projection. `value` is a
 * representative estimate and may intentionally come from another available
 * finish, so it is only a compatibility fallback for projections created
 * before `variantValues` existed.
 */
function getExactCollectionCardValue(
  card: TCGCollectionCard,
  variant: TCGPhysicalVariant,
): TCGCardValue | null {
  if (card.variantValues && Object.prototype.hasOwnProperty.call(card.variantValues, variant)) {
    return card.variantValues[variant] ?? null;
  }
  return variant === 'normal' ? card.value ?? null : null;
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
  /** Number of owned physical cards with no usable provider price. */
  unpricedCount?: number;
}

export interface TCGCollectionSetValuation {
  /** Per-currency totals for owned cards in one set. */
  groups: TCGCollectionValueGroup[];
  /** Number of owned physical cards in this set, priced or not. */
  ownedCount: number;
  /** Number of owned cards in this set that contributed a price. */
  pricedCount: number;
  /** Number of owned physical cards in this set with no usable price. */
  unpricedCount?: number;
}

export interface TCGCollectionValuationResult extends TCGCollectionValuation {
  /** Owned-card values grouped by set identifier. */
  bySet: Record<string, TCGCollectionSetValuation>;
}

export interface TCGOwnedVariant {
  cardId: string;
  variant: TCGCollectionVariant;
  quantity: number;
}

function groupsFromTotals(
  totals: Map<string, { total: number; count: number }>,
): TCGCollectionValueGroup[] {
  return [...totals.entries()]
    .map(([currency, { total, count }]) => ({
      currency,
      total: Math.round(total * 100) / 100,
      count,
    }))
    .sort((a, b) => b.total - a.total);
}

function getOnlyAvailablePhysicalVariant(
  variants: TCGCollectionCard['variants'],
): TCGPhysicalVariant | null {
  const availableVariants = TCG_PHYSICAL_VARIANTS.filter((variant) => variants?.[variant] === true);
  return availableVariants.length === 1 ? availableVariants[0] : null;
}

/**
 * Aggregate the estimated value of the owned subset of `cards`, grouped by
 * currency and set in one pass. Pure and allocation-light so it stays fast on
 * large collections when memoised by the caller.
 */
export function aggregateCollectionValueWithSets(
  cards: TCGCollectionCard[],
  ownedIds: Set<string>,
  displayCurrency?: TCGDisplayCurrency,
): TCGCollectionValuationResult {
  // This id-only API predates physical finishes. Preserve its compatibility
  // contract by valuing the projected representative `card.value`; callers
  // that know the actual finish must use `aggregateCollectionValueWithVariants`.
  const totals = new Map<string, { total: number; count: number }>();
  const totalsBySet = new Map<string, Map<string, { total: number; count: number }>>();
  const pricedBySet = new Map<string, number>();
  const unpricedBySet = new Map<string, number>();
  const ownedBySet = new Map<string, number>();
  let ownedCount = 0;
  let pricedCount = 0;
  let unpricedCount = 0;

  for (const card of cards) {
    if (!ownedIds.has(card.id)) continue;
    ownedCount += 1;
    if (card.setId) {
      ownedBySet.set(card.setId, (ownedBySet.get(card.setId) ?? 0) + 1);
      if (!totalsBySet.has(card.setId)) totalsBySet.set(card.setId, new Map());
    }

    const value = getTCGValueInCurrency(card.value, displayCurrency);
    const currency = value?.currency.trim().toUpperCase() || null;
    if (!value || !currency) {
      unpricedCount += 1;
      if (card.setId) unpricedBySet.set(card.setId, (unpricedBySet.get(card.setId) ?? 0) + 1);
      continue;
    }

    pricedCount += 1;
    const totalEntry = totals.get(currency) ?? { total: 0, count: 0 };
    totalEntry.total += value.amount;
    totalEntry.count += 1;
    totals.set(currency, totalEntry);

    if (card.setId) {
      const setTotals = totalsBySet.get(card.setId)!;
      const setEntry = setTotals.get(currency) ?? { total: 0, count: 0 };
      setEntry.total += value.amount;
      setEntry.count += 1;
      setTotals.set(currency, setEntry);
      pricedBySet.set(card.setId, (pricedBySet.get(card.setId) ?? 0) + 1);
    }
  }

  const bySet = Object.fromEntries(
    [...totalsBySet.entries()].map(([setId, setTotals]) => [
      setId,
      {
        groups: groupsFromTotals(setTotals),
        ownedCount: ownedBySet.get(setId) ?? 0,
        pricedCount: pricedBySet.get(setId) ?? 0,
        unpricedCount: unpricedBySet.get(setId) ?? 0,
      },
    ]),
  );

  return { groups: groupsFromTotals(totals), ownedCount, pricedCount, unpricedCount, bySet };
}

/**
 * Aggregate actual physical variant quantities in one pass. Missing prices do
 * not contribute to totals but remain represented in `ownedCount`.
 */
export function aggregateCollectionValueWithVariants(
  cards: TCGCollectionCard[],
  ownedVariants: readonly TCGOwnedVariant[],
  displayCurrency?: TCGDisplayCurrency,
): TCGCollectionValuationResult {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const totals = new Map<string, { total: number; count: number }>();
  const totalsBySet = new Map<string, Map<string, { total: number; count: number }>>();
  const pricedBySet = new Map<string, number>();
  const unpricedBySet = new Map<string, number>();
  const ownedBySet = new Map<string, number>();
  let ownedCount = 0;
  let pricedCount = 0;
  let unpricedCount = 0;

  for (const owned of ownedVariants) {
    const card = cardsById.get(owned.cardId);
    const normalizedQuantity = normalizeTCGCollectionQuantity(owned.quantity);
    const quantity = normalizedQuantity ?? 0;
    if (!card || quantity === 0) continue;
    ownedCount += quantity;

    const setTotals = card.setId
      ? (totalsBySet.get(card.setId) ?? new Map<string, { total: number; count: number }>())
      : null;
    if (card.setId && !totalsBySet.has(card.setId)) totalsBySet.set(card.setId, setTotals!);
    if (card.setId) ownedBySet.set(card.setId, (ownedBySet.get(card.setId) ?? 0) + quantity);

    // Historical/imported possessions do not carry a finish. Keep that fact in
    // the collection model unless TCGdex declares exactly one possible finish;
    // only that case can be inferred without inventing a physical variant.
    // Once a finish is known, prefer its exact provider value and never fall
    // back to a different physical finish.
    const physicalVariant = owned.variant === 'unspecified'
      ? getOnlyAvailablePhysicalVariant(card.variants)
      : owned.variant;
    const variantAvailable = physicalVariant !== null && card.variants?.[physicalVariant] === true;
    const value = physicalVariant === null
      ? null
      : !variantAvailable
        ? null
        : getExactCollectionCardValue(card, physicalVariant);
    const displayValue = getTCGValueInCurrency(value, displayCurrency);
    const currency = displayValue?.currency.trim().toUpperCase() || null;
    if (!displayValue || !currency) {
      unpricedCount += quantity;
      if (card.setId) unpricedBySet.set(card.setId, (unpricedBySet.get(card.setId) ?? 0) + quantity);
      continue;
    }
    pricedCount += quantity;

    const entry = totals.get(currency) ?? { total: 0, count: 0 };
    entry.total += displayValue.amount * quantity;
    entry.count += quantity;
    totals.set(currency, entry);

    if (setTotals && card.setId) {
      const setEntry = setTotals.get(currency) ?? { total: 0, count: 0 };
      setEntry.total += displayValue.amount * quantity;
      setEntry.count += quantity;
      setTotals.set(currency, setEntry);
      pricedBySet.set(card.setId, (pricedBySet.get(card.setId) ?? 0) + quantity);
    }
  }

  const bySet = Object.fromEntries(
    [...totalsBySet.entries()].map(([setId, setTotals]) => [
      setId,
      {
        groups: groupsFromTotals(setTotals),
        ownedCount: ownedBySet.get(setId) ?? 0,
        pricedCount: pricedBySet.get(setId) ?? 0,
        unpricedCount: unpricedBySet.get(setId) ?? 0,
      },
    ]),
  );

  return { groups: groupsFromTotals(totals), ownedCount, pricedCount, unpricedCount, bySet };
}

/** Aggregate the owned value globally, preserving the legacy return shape. */
export function aggregateCollectionValue(
  cards: TCGCollectionCard[],
  ownedIds: Set<string>,
  displayCurrency?: TCGDisplayCurrency,
): TCGCollectionValuation {
  const valuation = aggregateCollectionValueWithSets(cards, ownedIds, displayCurrency);
  return {
    groups: valuation.groups,
    ownedCount: valuation.ownedCount,
    pricedCount: valuation.pricedCount,
  };
}

/**
 * Aggregate the priced subset of owned cards by set without combining
 * currencies. Cards without a set identifier remain part of the global
 * valuation but cannot be assigned to a per-set row.
 */
export function aggregateCollectionValueBySet(
  cards: TCGCollectionCard[],
  ownedIds: Set<string>,
  displayCurrency?: TCGDisplayCurrency,
): Record<string, TCGCollectionSetValuation> {
  return aggregateCollectionValueWithSets(cards, ownedIds, displayCurrency).bySet;
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
  ownedVariants?: readonly TCGOwnedVariant[],
): TCGActiveSetInsights {
  const completion = getSetCompletionFromSet(set, ownedIds);
  const physicalOwned = ownedVariants
    ? ownedVariants.reduce((sum, ownership) => sum + (Number.isInteger(ownership.quantity) && ownership.quantity > 0 ? ownership.quantity : 0), 0)
    : completion.owned;
  return {
    completion,
    topMissing: [],
    valuation: {
      groups: [],
      ownedCount: physicalOwned,
      pricedCount: 0,
      unpricedCount: physicalOwned,
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
  displayCurrency?: TCGDisplayCurrency,
): TCGCollectionValueGroup[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const card of cards) {
    const variants = card.variants
      ? TCG_PHYSICAL_VARIANTS.filter((variant) => card.variants?.[variant] === true)
      : [];
    for (const variant of variants) {
      const value = getExactCollectionCardValue(card, variant);
      const displayValue = getTCGValueInCurrency(value, displayCurrency);
      const currency = displayValue?.currency.trim().toUpperCase() || null;
      if (!displayValue || !currency) continue;
      const entry = totals.get(currency) ?? { total: 0, count: 0 };
      entry.total += displayValue.amount;
      entry.count++;
      totals.set(currency, entry);
    }
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
  ownedVariants?: readonly TCGOwnedVariant[],
  displayCurrency?: TCGDisplayCurrency,
): TCGActiveSetInsights {
  return {
    completion: getSetCompletionFromCards(cards, ownedIds),
    topMissing: getTopMissingCards(cards, ownedIds, topMissingLimit),
    valuation: ownedVariants
      ? aggregateCollectionValueWithVariants(cards, ownedVariants, displayCurrency)
      : aggregateCollectionValue(cards, ownedIds, displayCurrency),
    setTotalValue: aggregateSetTotalValue(cards, displayCurrency),
  };
}
