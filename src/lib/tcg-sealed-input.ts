export const SEALED_MONEY_FIELDS = [
  'unitPriceCents',
  'feesCents',
  'shippingCents',
  'discountCents',
  'paymentFeesCents',
  'otherCostsCents',
] as const;

export type SealedMoneyField = (typeof SEALED_MONEY_FIELDS)[number];

const EURO_INPUT_PATTERN = /^(?:\d+(?:\.[0-9]{0,2})?|\.[0-9]{1,2})$/;

/** Parses an editable EUR amount while accepting both decimal separators. */
export function parseSealedEuroInput(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return 0;
  if (!EURO_INPUT_PATTERN.test(normalized)) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;

  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Keeps zero fields empty so the user can type a whole euro amount directly. */
export function formatSealedEuroInput(cents: number, language: string): string {
  if (cents === 0) return '';
  const decimalSeparator = new Intl.NumberFormat(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? '.';
  return (cents / 100).toFixed(2).replace('.', decimalSeparator);
}

export function sealedEuroPlaceholder(language: string): string {
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(0);
}
