import type { SupportedLanguage } from './languages';

export type ReleaseWindow =
  | { precision: 'day'; date: `${number}-${number}-${number}` }
  | { precision: 'month'; year: number; month: number }
  | { precision: 'quarter'; year: number; quarter: 1 | 2 | 3 | 4 };

/** `announced` is the stored editorial default; its display status is date-aware. */
export type ReleaseStatus = 'announced' | 'released' | 'postponed' | 'availability-uncertain';
export type ReleaseDisplayStatus = 'upcoming' | 'released' | 'postponed' | 'availability-uncertain';

export interface EditorialSource {
  url: `https://${string}`;
  verifiedAt: `${number}-${number}-${number}`;
  publisher: 'The Pokémon Company' | 'PokéCardex' | 'DGCCRF' | 'SignalConso';
}

export interface SealedReleaseV1 {
  id: string;
  titleFr: string;
  kind: 'expansion' | 'sealed-product';
  market: 'FR';
  window: ReleaseWindow;
  status: ReleaseStatus;
  source: EditorialSource;
  /** French recommended retail price, stored in euro cents when sourced. */
  retailPriceCents?: number;
  /** Provenance for the recommended price when it differs from the release-date source. */
  priceSource?: EditorialSource;
  /** Only set after an editor confirms the exact catalogue match. */
  cardmarketProductId?: number;
}

const quarterLabels: Record<SupportedLanguage, (quarter: number, year: number) => string> = {
  fr: (quarter, year) => `${quarter}e trimestre ${year}`,
  en: (quarter, year) => `Q${quarter} ${year}`,
  es: (quarter, year) => `T${quarter} ${year}`,
  de: (quarter, year) => `${quarter}. Quartal ${year}`,
  it: (quarter, year) => `${quarter}º trimestre ${year}`,
  ja: (quarter, year) => `${year}年第${quarter}四半期`,
  ko: (quarter, year) => `${year}년 ${quarter}분기`,
  zh: (quarter, year) => `${year}年第${quarter}季度`,
};

function dateInMarketTimezone(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Paris',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function releaseWindowBounds(window: ReleaseWindow): { start: string; end: string } {
  if (window.precision === 'day') return { start: window.date, end: window.date };
  if (window.precision === 'month') {
    const month = String(window.month).padStart(2, '0');
    const lastDay = new Date(Date.UTC(window.year, window.month, 0)).getUTCDate();
    return { start: `${window.year}-${month}-01`, end: `${window.year}-${month}-${String(lastDay).padStart(2, '0')}` };
  }
  const startMonth = (window.quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const endDay = new Date(Date.UTC(window.year, endMonth, 0)).getUTCDate();
  return {
    start: `${window.year}-${String(startMonth).padStart(2, '0')}-01`,
    end: `${window.year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
  };
}

/**
 * Resolve an announced date against the French market calendar. A passed
 * estimate only means availability needs checking; it does not prove release.
 * Explicit editorial statuses remain overrides for confirmed releases,
 * postponements, and exceptional availability situations.
 */
export function getReleaseDisplayStatus(release: Pick<SealedReleaseV1, 'window' | 'status'>, now = new Date()): ReleaseDisplayStatus {
  if (release.status !== 'announced') return release.status;
  const today = dateInMarketTimezone(now);
  if (release.window.precision === 'day') {
    return release.window.date > today ? 'upcoming' : 'availability-uncertain';
  }
  const { end } = releaseWindowBounds(release.window);
  return end >= today ? 'upcoming' : 'availability-uncertain';
}

export function formatReleaseVerificationDate(date: string, language: SupportedLanguage): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(timestamp);
}

export function formatReleaseWindow(window: ReleaseWindow, language: SupportedLanguage): string {
  if (window.precision === 'quarter') return quarterLabels[language](window.quarter, window.year);
  const date = window.precision === 'day'
    ? new Date(`${window.date}T12:00:00Z`)
    : new Date(Date.UTC(window.year, window.month - 1, 15, 12));
  return new Intl.DateTimeFormat(language, window.precision === 'day'
    ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    : { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export function sealedReleaseMarketHref(productId: number | undefined, language: SupportedLanguage): string | null {
  if (!Number.isSafeInteger(productId) || (productId ?? 0) < 1 || (productId ?? 0) > 2_147_483_647) return null;
  return `/${language}/tcg/sealed/market/${productId}`;
}
