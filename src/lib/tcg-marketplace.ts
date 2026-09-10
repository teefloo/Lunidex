import type { SupportedLanguage } from '@/lib/languages';
import type { TCGCard } from '@/types/tcg';

type CardmarketLanguage = Extract<SupportedLanguage, 'de' | 'en' | 'es' | 'fr' | 'it'>;

const CARDMARKET_LANGUAGES: readonly CardmarketLanguage[] = ['de', 'en', 'es', 'fr', 'it'];

function resolveCardmarketLanguage(language: SupportedLanguage): CardmarketLanguage {
  return CARDMARKET_LANGUAGES.includes(language as CardmarketLanguage)
    ? (language as CardmarketLanguage)
    : 'en';
}

function isValidProductId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function normalizeVariantType(value: string | undefined): 'normal' | 'reverse' | 'holo' | null {
  const normalized = value?.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized === 'normal') return 'normal';
  if (normalized === 'reverse' || normalized === 'reverseholo' || normalized === 'reverseholofoil') return 'reverse';
  if (normalized === 'holo' || normalized === 'holofoil') return 'holo';
  return null;
}

/**
 * Resolve the stable Cardmarket product id TCGdex attaches to a card.
 *
 * Newer TCGdex payloads put the id on each detailed printing while older
 * payloads can expose it on the card or pricing block. Prefer an unmarked
 * standard printing so a special stamped/foil printing is never opened by
 * accident.
 */
export function getCardmarketProductId(card: Pick<TCGCard, 'thirdParty' | 'variants_detailed' | 'pricing'>): number | null {
  if (isValidProductId(card.thirdParty?.cardmarket)) return card.thirdParty.cardmarket;

  const detailedVariants = Array.isArray(card.variants_detailed) ? card.variants_detailed : [];
  const variantPriority: Array<'normal' | 'holo' | 'reverse'> = ['normal', 'holo', 'reverse'];

  for (const variant of variantPriority) {
    const detailedVariant = detailedVariants.find((entry) => (
      normalizeVariantType(entry.type) === variant
      && !entry.stamp
      && !entry.foil
      && isValidProductId(entry.thirdParty?.cardmarket)
    ));
    if (detailedVariant?.thirdParty?.cardmarket) return detailedVariant.thirdParty.cardmarket;
  }

  const anyDetailedVariant = detailedVariants.find((entry) => isValidProductId(entry.thirdParty?.cardmarket));
  if (anyDetailedVariant?.thirdParty?.cardmarket) return anyDetailedVariant.thirdParty.cardmarket;

  const pricingProductId = card.pricing?.cardmarket?.idProduct;
  return isValidProductId(pricingProductId) ? pricingProductId : null;
}

/**
 * Build Cardmarket's direct product route from TCGdex's stable product id.
 * The `idProduct` route is intentionally used instead of a text search or a
 * guessed slug: names and set translations differ between Cardmarket locales.
 */
export function getCardmarketProductUrl(
  card: Pick<TCGCard, 'thirdParty' | 'variants_detailed' | 'pricing'>,
  language: SupportedLanguage,
): string | null {
  const productId = getCardmarketProductId(card);
  if (!productId) return null;

  const url = new URL(
    `https://www.cardmarket.com/${resolveCardmarketLanguage(language)}/Pokemon/Products`,
  );

  url.searchParams.set('idProduct', String(productId));
  return url.toString();
}
