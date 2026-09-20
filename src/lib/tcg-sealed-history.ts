import type { SealedPortfolioPoint, SealedPortfolioTotals } from '@primedex/core';

export interface SealedPortfolioDailyRow {
  day: string | Date;
  data: unknown;
}

const TOTAL_KEYS: Array<keyof SealedPortfolioTotals> = [
  'units',
  'costCents',
  'valueCents',
  'latentCents',
  'realizedCents',
  'totalCents',
  'spentCents',
  'grossSalesCents',
  'netSalesCents',
  'buyFeesCents',
  'sellFeesCents',
  'bought',
  'sold',
  'exchangeIn',
  'exchangeOut',
  'distinct',
  'missingPrices',
  'roi',
  'cashFlowCents',
  'soldCostCents',
  'averageEntryCents',
  'averageExitCents',
  'holdingDays',
  'winningSales',
  'losingSales',
  'profitPerSoldUnitCents',
  'sellThrough',
];

const NULLABLE_KEYS = new Set<keyof SealedPortfolioTotals>([
  'valueCents',
  'latentCents',
  'totalCents',
  'roi',
  'averageEntryCents',
  'averageExitCents',
  'holdingDays',
  'winningSales',
  'losingSales',
  'profitPerSoldUnitCents',
  'sellThrough',
]);

function dayValue(value: string | Date): string {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function parseSealedPortfolioDailyPoint(row: SealedPortfolioDailyRow): SealedPortfolioPoint | null {
  const day = dayValue(row.day);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !row.data || typeof row.data !== 'object' || Array.isArray(row.data)) return null;
  const value = row.data as Record<string, unknown>;
  if (value.day !== day) return null;
  for (const key of TOTAL_KEYS) {
    if (value[key] === null && NULLABLE_KEYS.has(key)) continue;
    if (!finite(value[key])) return null;
  }
  return { day, ...value } as SealedPortfolioPoint;
}

export function mergeSealedPortfolioHistory(
  cached: readonly SealedPortfolioPoint[],
  computed: readonly SealedPortfolioPoint[],
  from: string,
  to: string,
): SealedPortfolioPoint[] {
  const byDay = new Map<string, SealedPortfolioPoint>();
  for (const item of cached) byDay.set(item.day, item);
  for (const item of computed) byDay.set(item.day, item);
  const points = [...byDay.values()]
    .filter((item) => (from === '0000-01-01' || item.day >= from) && item.day <= to)
    .sort((left, right) => left.day.localeCompare(right.day));
  if (points.length <= 366) return points;
  const step = Math.ceil(points.length / 366);
  return points.filter((_, index) => index % step === 0 || index === points.length - 1);
}
