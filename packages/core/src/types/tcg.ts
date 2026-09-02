export type TCGCardCategory = 'Pokemon' | 'Trainer' | 'Energy';

export type TCGCardCategoryFilter = TCGCardCategory | 'all';

export type TCGCardSortField = 'name' | 'id' | 'number' | 'hp' | 'rarity' | 'releaseDate' | 'marketPrice' | 'updated';

export type TCGCardSortOrder = 'asc' | 'desc';

export type TCGCardViewMode = 'visual' | 'table' | 'scan';

export type TCGOwnedState = 'all' | 'owned' | 'wishlist' | 'missing';

export type { TCGCardLanguage } from '../lib/tcg-language';
export type {
  TCGCollection,
  TCGCollectionCardOwnership,
  TCGCollectionState,
  TCGCollectionVariant,
  TCGPhysicalVariant,
} from '../lib/tcg-collections';
export type { TCGDisplayCurrency } from '../lib/tcg-currency';

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
  firstEdition?: boolean;
  holo?: boolean;
  normal?: boolean;
  reverse?: boolean;
  wPromo?: boolean;
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

/** TCGdex `pricing.tcgplayer` block, keyed by marketplace variant. */
export interface TCGPlayerPricing {
  unit?: string;
  updated?: string;
  normal?: TCGPlayerPriceTier;
  /** Some TCGdex payloads use the shorter `holo` alias. */
  holo?: TCGPlayerPriceTier;
  holofoil?: TCGPlayerPriceTier;
  reverse?: TCGPlayerPriceTier;
  'reverse-holofoil'?: TCGPlayerPriceTier;
  [variant: string]: TCGPlayerPriceTier | string | undefined;
}

/** TCGdex Cardmarket data, including foil-specific fields. */
export interface TCGCardmarketPricing {
  unit?: string;
  updated?: string;
  avg?: number | null;
  low?: number | null;
  trend?: number | null;
  avg1?: number | null;
  avg7?: number | null;
  avg30?: number | null;
  'avg-holo'?: number | null;
  'low-holo'?: number | null;
  'trend-holo'?: number | null;
  'avg1-holo'?: number | null;
  'avg7-holo'?: number | null;
  'avg30-holo'?: number | null;
  'avg-reverse-holo'?: number | null;
  'low-reverse-holo'?: number | null;
  'trend-reverse-holo'?: number | null;
  'avg1-reverse-holo'?: number | null;
  'avg7-reverse-holo'?: number | null;
  'avg30-reverse-holo'?: number | null;
}

export interface TCGCardPricing {
  tcgplayer?: TCGPlayerPricing;
  cardmarket?: TCGCardmarketPricing;
}

/** TCGdex pricing attached to one concrete physical card variant. */
export interface TCGCardVariantDetailed {
  type: string;
  size?: string;
  variantId?: string;
  stamp?: string | string[] | null;
  foil?: string | null;
  pricing?: TCGCardPricing | null;
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
  /** TCGdex's exact per-printing pricing payload (newer card responses). */
  variants_detailed?: TCGCardVariantDetailed[];
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
