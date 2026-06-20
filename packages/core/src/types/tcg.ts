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

export interface TCGCardPricing {
  tcgplayer?: unknown;
  cardmarket?: unknown;
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
