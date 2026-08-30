export type TCGCardCategory = 'Pokemon' | 'Trainer' | 'Energy';

export type TCGCardCategoryFilter = TCGCardCategory | 'all';

export type TCGCardSortField = 'name' | 'id' | 'number' | 'hp' | 'rarity' | 'releaseDate' | 'marketPrice' | 'updated';

export type TCGCardSortOrder = 'asc' | 'desc';

export type TCGCardViewMode = 'visual' | 'table' | 'scan';

export type TCGOwnedState = 'all' | 'owned' | 'wishlist' | 'missing';

export type TCGLegalState = 'standard' | 'expanded' | 'unlimited';

export interface TCGCardAttack {
  name?: string;
  cost?: string[];
  damage?: string;
  effect?: string;
  text?: string;
}

export interface TCGCardAbility {
  name?: string;
  effect?: string;
  text?: string;
  type?: string;
}

export interface TCGResistanceWeakness {
  type: string;
  value: string;
}

export interface TCGCardVariants {
  firstEdition: boolean;
  holo: boolean;
  normal: boolean;
  reverse: boolean;
  wPromo: boolean;
}

export interface TCGCardLegalities {
  standard?: boolean;
  expanded?: boolean;
  unlimited?: boolean;
}

/** Per-variant TCGplayer pricing tier (USD). */
export interface TCGPlayerPriceTier {
  lowPrice?: number | null;
  midPrice?: number | null;
  highPrice?: number | null;
  marketPrice?: number | null;
  directLowPrice?: number | null;
}

/** TCGdex `pricing.tcgplayer` block. Keyed by variant (`normal`, `holofoil`, …) in USD. */
export interface TCGPlayerPricing {
  unit?: string;
  updated?: string;
  normal?: TCGPlayerPriceTier;
  holofoil?: TCGPlayerPriceTier;
  'reverse-holofoil'?: TCGPlayerPriceTier;
  [variant: string]: TCGPlayerPriceTier | string | undefined;
}

/** TCGdex `pricing.cardmarket` block (EUR). */
export interface TCGCardmarketPricing {
  unit?: string;
  updated?: string;
  avg?: number;
  low?: number;
  trend?: number;
  avg1?: number;
  avg7?: number;
  avg30?: number;
}

export interface TCGCardPricing {
  tcgplayer?: TCGPlayerPricing;
  cardmarket?: TCGCardmarketPricing;
}

/** A single resolved market value for a card, in one currency. */
export interface TCGCardValue {
  amount: number;
  currency: string;
}

/**
 * Slim, owned-independent projection of a card used for collection statistics.
 * Built server-side (route handler) so the heavy per-card hydration is shared
 * across users and HTTP-cacheable, while ownership stays purely client-side.
 */
export interface TCGCollectionCard {
  id: string;
  localId: string;
  name: string;
  /** Set identifier used to group owned-card valuations by extension. */
  setId: string;
  image?: string;
  rarity?: string | null;
  value?: TCGCardValue | null;
}

export interface TCGPriceSnapshot {
  provider: 'tcgplayer' | 'cardmarket' | 'manual';
  currency: string;
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  updatedAt?: string;
  url?: string;
}

export interface TCGCardBooster {
  id: string;
  name: string;
  logo?: string;
  artwork_front?: string;
  artwork_back?: string;
}

export interface TCGCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  imageUrl?: string;
  rarity?: string;
  category?: TCGCardCategory;
  suffix?: string;
  stage?: string;
  evolveFrom?: string;
  trainerType?: string;
  energyType?: string;
  effect?: string;
  description?: string;
  types?: string[];
  hp?: number;
  illustrator?: string;
  variants?: TCGCardVariants;
  boosters?: TCGCardBooster[] | null;
  set?: TCGSet;
  attacks?: TCGCardAttack[];
  abilities?: TCGCardAbility | TCGCardAbility[];
  resistances?: TCGResistanceWeakness[];
  weaknesses?: TCGResistanceWeakness[];
  retreat?: number;
  retreatCost?: number;
  regulationMark?: string;
  flavorText?: string;
  number?: string;
  source?: string;
  updated?: string;
  legal?: TCGCardLegalities;
  pricing?: TCGCardPricing;
  dexId?: number[];
  level?: string;
  item?: {
    name?: string;
    effect?: string;
  };
}

// TCGdex API returns cardCount as { total, official }, not a flat number.
export interface TCGCardCount {
  total: number;
  official: number;
}

export interface TCGSet {
  id: string;
  name: string;
  serie?: {
    id: string;
    name: string;
  };
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  /** Actual API shape from TCGdex v2 */
  cardCount?: TCGCardCount;
  /** Alias kept for backward compatibility - derived from cardCount.total */
  totalCards?: number;
  legalities?: {
    unlimited?: string;
    standard?: string;
    expanded?: string;
  };
}

/**
 * Compact set metadata used by the authenticated collection landing page.
 * `releaseRank` comes from TCGdex's release-date ordering because the brief
 * set response does not include the date itself.
 */
export interface TCGCollectionSetSummary extends TCGSet {
  totalCards: number;
  releaseRank: number;
  dataLanguage: string;
}

/** A set and its card summaries loaded together for the collection album. */
export interface TCGSetAlbumData {
  set: TCGSet;
  cards: TCGCard[];
  dataLanguage: string;
}

export interface TCGFilterOptions {
  categories?: TCGCardCategoryFilter[];
  sets?: TCGSet[];
  pokemonTypes?: string[];
  trainerTypes?: string[];
  energyTypes?: string[];
  stages?: string[];
  rarities?: string[];
}

export interface TCGCardFilters {
  searchTerm?: string;
  selectedCategory?: TCGCardCategoryFilter;
  selectedSet?: string | null;
  selectedTypes?: string[];
  selectedRarity?: string | null;
  selectedPhase?: string | null;
  selectedTrainerTypes?: string[];
  selectedEnergyTypes?: string[];
  minHp?: number;
  maxHp?: number;
  illustrator?: string;
  regulationMark?: string;
  legalities?: TCGLegalState[];
  priceMin?: number;
  priceMax?: number;
  releaseStart?: string;
  releaseEnd?: string;
  ownedState?: TCGOwnedState;
  sortBy?: TCGCardSortField;
  sortOrder?: TCGCardSortOrder;
}

export interface TCGCatalogPageResult {
  cards: TCGCard[];
  hasMore: boolean;
}

export interface TCGSearchFacetEntry {
  key: string;
  label: string;
  count: number;
}

export interface TCGSearchFacets {
  cards: number;
  sets: TCGSearchFacetEntry[];
  rarities: TCGSearchFacetEntry[];
  types: TCGSearchFacetEntry[];
  stages: TCGSearchFacetEntry[];
  trainers: TCGSearchFacetEntry[];
  energies: TCGSearchFacetEntry[];
}

export interface TCGSearchInsightLine {
  label: string;
  value: string;
  tone?: 'default' | 'primary' | 'warning' | 'success';
}

export interface TCGSearchInsights {
  totalResults: number;
  totalSets: number;
  activeSet?: TCGSet | null;
  topRarities: TCGSearchFacetEntry[];
  topTypes: TCGSearchFacetEntry[];
  lines: TCGSearchInsightLine[];
}

export interface TCGSavedSearch {
  id: string;
  name: string;
  query: string;
  filters: TCGCardFilters;
  viewMode: TCGCardViewMode;
  createdAt: string;
}

export interface TCGUserCardEntry {
  cardId: string;
  state: Exclude<TCGOwnedState, 'all' | 'missing'>;
  note?: string;
  updatedAt: string;
}

export interface TCGDeckCard {
  cardId: string;
  quantity: number;
}

export interface TCGDeck {
  id: string;
  name: string;
  cards: TCGDeckCard[];
  createdAt: string;
}
