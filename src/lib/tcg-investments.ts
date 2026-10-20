import type { InvestmentVariant } from '@primedex/core/lib/tcg-investments';
import { getTCGVariantValue } from '@/lib/tcg-collection';
import type { TCGCard, TCGCardPricing, TCGCardValue } from '@/types/tcg';

export function parseEuroCents(value: string): number | null {
  if (!/^\d{1,7}([.,]\d{1,2})?$/.test(value.trim())) return null;
  const cents = Math.round(Number(value.trim().replace(',', '.')) * 100);
  return cents <= 100_000_000 ? cents : null;
}

/** Reference only: these feeds do not certify a copy's language or condition. */
export function getInvestmentReferenceQuote(card: TCGCard, variant: InvestmentVariant, printing: string) {
  if (printing.trim() || !['normal', 'holo', 'reverse'].includes(variant)) return null;
  const exactFinish = variant as 'normal' | 'holo' | 'reverse';
  if (exactFinish !== 'reverse') return getTCGVariantValue(card, exactFinish, 'EUR');
  // The general collection resolver intentionally falls back from reverse to
  // holo. An acquisition needs a stricter reference: remove that fallback.
  const strictPricing = (pricing: TCGCardPricing | null | undefined): TCGCardPricing | null | undefined => {
    if (!pricing?.cardmarket) return pricing;
    return {
      ...pricing,
      cardmarket: Object.fromEntries(Object.entries(pricing.cardmarket).filter(([key]) => !key.endsWith('-holo') || key.endsWith('-reverse-holo'))),
    };
  };
  return getTCGVariantValue({
    ...card, pricing: strictPricing(card.pricing) ?? undefined,
    variants_detailed: card.variants_detailed?.map((entry) => ({ ...entry, pricing: strictPricing(entry.pricing) })),
  }, exactFinish, 'EUR');
}

export interface TCGInvestmentMarketReference {
  variant: 'normal' | 'holo' | 'reverse';
  quote: TCGCardValue;
  /** False when the quote belongs to a standard finish rather than the recorded printing. */
  matchesFinish: boolean;
}

/**
 * Find a EUR reference for display beside a purchase. Exact finish quotes win;
 * custom or unsupported printings may show a standard finish as context only.
 * This value must never be written into the user's manual investment valuation.
 */
export function getInvestmentMarketReference(
  card: TCGCard,
  variant: InvestmentVariant,
  printing: string,
): TCGInvestmentMarketReference | null {
  const standardVariants = ['normal', 'holo', 'reverse'] as const;
  const selectedVariant = standardVariants.find((candidate) => candidate === variant);
  if (selectedVariant && !printing.trim()) {
    const exactQuote = getInvestmentReferenceQuote(card, selectedVariant, printing);
    if (exactQuote) return { variant: selectedVariant, quote: exactQuote, matchesFinish: true };
  }

  for (const candidate of standardVariants) {
    if (candidate === selectedVariant && !printing.trim()) continue;
    const quote = getInvestmentReferenceQuote(card, candidate, '');
    if (quote) return { variant: candidate, quote, matchesFinish: false };
  }

  return null;
}
