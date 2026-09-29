import type { SupportedLanguage } from './languages';

export type ReleaseWindow =
  | { precision: 'day'; date: `${number}-${number}-${number}` }
  | { precision: 'month'; year: number; month: number }
  | { precision: 'quarter'; year: number; quarter: 1 | 2 | 3 | 4 };

export type ReleaseStatus = 'announced' | 'released' | 'postponed';

export interface EditorialSource {
  url: `https://${string}`;
  verifiedAt: `${number}-${number}-${number}`;
  publisher: 'The Pokémon Company' | 'DGCCRF' | 'SignalConso';
}

export interface SealedReleaseV1 {
  id: string;
  titleFr: string;
  kind: 'expansion' | 'sealed-product';
  market: 'FR';
  window: ReleaseWindow;
  status: ReleaseStatus;
  source: EditorialSource;
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

export function formatReleaseWindow(window: ReleaseWindow, language: SupportedLanguage): string {
  if (window.precision === 'quarter') return quarterLabels[language](window.quarter, window.year);
  const date = window.precision === 'day'
    ? new Date(`${window.date}T12:00:00Z`)
    : new Date(Date.UTC(window.year, window.month - 1, 15, 12));
  return new Intl.DateTimeFormat(language, window.precision === 'day'
    ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    : { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}
