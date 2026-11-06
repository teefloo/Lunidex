import type { TCGCard, TCGCardmarketPricing } from '@/types/tcg';
import type { TCGCardLanguage } from '@/lib/tcg-language';

export type TCGPriceVariant = 'normal' | 'holo' | 'reverse';

export interface QualifiedCardmarketObservation {
  cardId: string;
  setId: string;
  cardLanguage: TCGCardLanguage;
  cardmarketProductId: number;
  variant: TCGPriceVariant;
  source: 'tcgdex-cardmarket';
  metric: 'trend';
  currency: 'EUR';
  value: number;
  sourceObservedAt: string;
  sourceDay: string;
}

const VARIANT_METRICS: ReadonlyArray<{
  variant: TCGPriceVariant;
  metricKey: 'trend' | 'trend-holo' | 'trend-reverse-holo';
}> = [
  { variant: 'normal', metricKey: 'trend' },
  { variant: 'holo', metricKey: 'trend-holo' },
  { variant: 'reverse', metricKey: 'trend-reverse-holo' },
];

const MAX_SOURCE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PRICE_EUR = 1_000_000;

/**
 * Projects only comparable Cardmarket trend points from a TCGdex card.
 * TCGdex does not provide Cardmarket quotes by language or condition, so the
 * route stores these as aggregate/unreported dimensions instead of implying
 * that a quote belongs to the card's printed language or condition.
 */
export function getQualifiedCardmarketObservations(
  card: TCGCard,
  cardLanguage: TCGCardLanguage,
  collectedAt = new Date(),
): QualifiedCardmarketObservation[] {
  const pricing = card.pricing?.cardmarket;
  const setId = card.set?.id?.trim();
  const productId = pricing?.idProduct;
  const sourceTimestamp = pricing?.updated ? Date.parse(pricing.updated) : NaN;
  if (!pricing || pricing.unit !== 'EUR'
    || !setId || setId.length > 80
    || !Number.isSafeInteger(productId) || (productId ?? 0) <= 0
    || !Number.isFinite(sourceTimestamp)
    || sourceTimestamp > collectedAt.getTime()
    || collectedAt.getTime() - sourceTimestamp > MAX_SOURCE_AGE_MS) return [];

  const sourceObservedAt = new Date(sourceTimestamp).toISOString();
  const sourceDay = sourceObservedAt.slice(0, 10);
  return VARIANT_METRICS.flatMap(({ variant, metricKey }) => {
    if (card.variants?.[variant] !== true) return [];
    const value = pricing[metricKey];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > MAX_PRICE_EUR) return [];
    return [{
      cardId: card.id,
      setId,
      cardLanguage,
      cardmarketProductId: productId as number,
      variant,
      source: 'tcgdex-cardmarket' as const,
      metric: 'trend' as const,
      currency: 'EUR' as const,
      value,
      sourceObservedAt,
      sourceDay,
    }];
  });
}

export function getCardmarketTrendForVariant(
  pricing: TCGCardmarketPricing,
  variant: TCGPriceVariant,
): number | null {
  const metricKey = VARIANT_METRICS.find((candidate) => candidate.variant === variant)?.metricKey;
  if (!metricKey) return null;
  const value = pricing[metricKey];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_PRICE_EUR ? value : null;
}
