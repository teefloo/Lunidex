/** Currencies supported by the user-facing TCG valuation preference. */
export const TCG_DISPLAY_CURRENCIES = ['EUR', 'USD'] as const;
export type TCGDisplayCurrency = (typeof TCG_DISPLAY_CURRENCIES)[number];

export const DEFAULT_TCG_DISPLAY_CURRENCY: TCGDisplayCurrency = 'EUR';

export function isTCGDisplayCurrency(value: unknown): value is TCGDisplayCurrency {
  return value === 'EUR' || value === 'USD';
}

/**
 * Normalize persisted/user input while keeping the fallback deterministic.
 * TCGdex exposes Cardmarket values in EUR and TCGplayer values in USD; the
 * application never invents an exchange rate between those source currencies.
 */
export function normalizeTCGDisplayCurrency(
  value: unknown,
  fallback: TCGDisplayCurrency = DEFAULT_TCG_DISPLAY_CURRENCY,
): TCGDisplayCurrency {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : value;
  return isTCGDisplayCurrency(normalized) ? normalized : fallback;
}
