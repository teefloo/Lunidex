/** Cardmarket categories that are treated as Pokémon sealed products. */
export const SEALED_PRODUCT_CATEGORY_IDS = [
  52, // Booster
  53, // Display
  54, // Theme Deck
  1013, // Trainer Kit
  1014, // Tin
  1015, // Box Set
  1016, // Elite Trainer Box
  1083, // Blister
  1654, // PCG Set
] as const;

export type SealedProductCategoryId = (typeof SEALED_PRODUCT_CATEGORY_IDS)[number];

export const SEALED_PRODUCT_LANGUAGES = ['unknown', 'en', 'fr', 'es', 'de', 'it', 'ja'] as const;
export type SealedProductLanguage = (typeof SEALED_PRODUCT_LANGUAGES)[number];

export type SealedTransactionKind = 'buy' | 'sell';
export type SealedAllocationMethod = 'fifo' | 'manual';
export type SealedPriceMetric = 'avg' | 'avg1' | 'avg7' | 'avg30' | 'trend' | 'low' | 'app_avg3';

export interface SealedProduct {
  cardmarketProductId: number;
  name: string;
  categoryId: number;
  categoryName: string;
  expansionId: number;
  cardmarketUrl: string;
  imageAvailable: boolean;
  sourceAt: string;
  updatedAt: string;
  active: boolean;
  alias?: string;
}

/** All Cardmarket price values are represented as integer EUR cents. */
export interface SealedPriceMetrics {
  avgCents: number | null;
  lowCents: number | null;
  trendCents: number | null;
  avg1Cents: number | null;
  avg7Cents: number | null;
  avg30Cents: number | null;
}

export interface SealedPriceSnapshot {
  cardmarketProductId: number;
  day: string;
  sourceAt: string;
  fetchedAt: string;
  metrics: SealedPriceMetrics;
}

export interface SealedAllocationSelection {
  lotId: string;
  quantity: number;
}

export interface SealedTransactionDraft {
  kind: SealedTransactionKind;
  cardmarketProductId: number;
  language: SealedProductLanguage;
  date: string;
  quantity: number;
  unitPriceCents: number;
  feesCents: number;
  shippingCents: number;
  discountCents: number;
  paymentFeesCents: number;
  otherCostsCents: number;
  platform: string;
  counterparty: string;
  notes: string;
  storage: string;
  allocationMethod: SealedAllocationMethod;
  selections: SealedAllocationSelection[];
}

export interface SealedTransaction extends SealedTransactionDraft {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  voided: boolean;
}

export interface SealedLot {
  transaction: SealedTransaction;
  remaining: number;
  costCents: number;
  consumed: number;
  allocatedCostCents: number;
}

export interface SealedAllocation {
  lotId: string;
  quantity: number;
  costCents: number;
  holdingDays: number;
}

export interface SealedSale {
  transaction: SealedTransaction;
  grossCents: number;
  feesCents: number;
  netCents: number;
  costCents: number;
  profitCents: number;
  roi: number | null;
  holdingDays: number;
  allocations: SealedAllocation[];
}

export interface SealedPosition {
  cardmarketProductId: number;
  language: SealedProductLanguage;
  bought: number;
  sold: number;
  quantity: number;
  spentCents: number;
  costCents: number;
  grossSalesCents: number;
  netSalesCents: number;
  realizedCents: number;
  buyFeesCents: number;
  sellFeesCents: number;
  firstBuy: string;
  lastBuy: string;
  lastSale: string | null;
}

export interface SealedLedgerResult {
  positions: SealedPosition[];
  lots: SealedLot[];
  sales: SealedSale[];
}

export interface SealedValuation {
  priceCents: number | null;
  metric: SealedPriceMetric | null;
  day: string | null;
  stale: boolean;
}

export interface SealedPortfolioTotals {
  units: number;
  costCents: number;
  valueCents: number | null;
  latentCents: number | null;
  realizedCents: number;
  totalCents: number | null;
  spentCents: number;
  grossSalesCents: number;
  netSalesCents: number;
  buyFeesCents: number;
  sellFeesCents: number;
  bought: number;
  sold: number;
  distinct: number;
  missingPrices: number;
  roi: number | null;
  cashFlowCents: number;
  soldCostCents: number;
  averageEntryCents: number | null;
  averageExitCents: number | null;
  holdingDays: number | null;
  winningSales: number | null;
  losingSales: number | null;
  profitPerSoldUnitCents: number | null;
  sellThrough: number | null;
}

export interface SealedPortfolioPoint extends SealedPortfolioTotals {
  day: string;
}

export interface SealedPositionView extends SealedPosition {
  product: SealedProduct;
  valuation: SealedValuation;
  valueCents: number | null;
  latentCents: number | null;
  latentRoi: number | null;
  lifetimeRoi: number | null;
  changes: {
    '1': { percent: number; metric: SealedPriceMetric } | null;
    '7': { percent: number; metric: SealedPriceMetric } | null;
    '30': { percent: number; metric: SealedPriceMetric } | null;
  };
}

export interface SealedCashflowRow {
  period: string;
  buysCents: number;
  buyFeesCents: number;
  discountCents: number;
  grossSalesCents: number;
  netSalesCents: number;
  sellFeesCents: number;
  netCents: number;
  investedCents: number;
  recoveredCents: number;
  stockCostCents: number;
}

export interface SealedSourceStatus {
  catalogueSourceAt: string | null;
  priceSourceAt: string | null;
  fetchedAt: string | null;
  catalogueCount: number;
  priceCount: number;
  matchedCount: number;
  lastRunStatus: 'success' | 'failed' | 'running' | null;
  lastRunError: string | null;
}
