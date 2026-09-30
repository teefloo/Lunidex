import { SEALED_PRODUCT_CATEGORY_IDS } from '@primedex/core/types/sealed';
import { isSupportedLanguage } from '@/lib/languages';
import type { SealedPriceSnapshot } from '@primedex/core/types/sealed';

export interface PublicMarketFilters {
  q: string;
  page: number;
  category?: number;
  expansion?: number;
}

const categoryIds = new Set<number>(SEALED_PRODUCT_CATEGORY_IDS);

function first(value: string | string[] | null | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function boundedId(value: string, allowZero = false): number | undefined {
  if (!(allowZero ? /^(?:0|[1-9]\d{0,9})$/ : /^[1-9]\d{0,9}$/).test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2_147_483_647 ? id : undefined;
}

export function parsePublicMarketFilters(input: Record<string, string | string[] | undefined> | URLSearchParams): PublicMarketFilters {
  const get = (key: string) => input instanceof URLSearchParams ? input.get(key) : input[key];
  const rawPage = first(get('page'));
  const page = /^\d{1,5}$/.test(rawPage) ? Math.min(10_000, Number(rawPage)) : 0;
  const category = boundedId(first(get('category')));
  const expansion = boundedId(first(get('expansion')), true);
  return {
    q: Array.from(first(get('q')).trim()).slice(0, 150).join(''),
    page,
    ...(category !== undefined && categoryIds.has(category) ? { category } : {}),
    ...(expansion !== undefined ? { expansion } : {}),
  };
}

export function publicMarketContactHref(language: string, productId?: number): string {
  const safeLanguage = isSupportedLanguage(language) ? language : 'en';
  const safeId = Number.isSafeInteger(productId) && (productId ?? 0) > 0 && (productId ?? 0) <= 2_147_483_647 ? productId : undefined;
  const query = new URLSearchParams({ topic: 'sealed-market' });
  if (safeId !== undefined) query.set('productId', String(safeId));
  return `/${safeLanguage}/contact?${query.toString()}`;
}

export function publicMarketHref(filters: PublicMarketFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.category) params.set('category', String(filters.category));
  if (filters.expansion !== undefined) params.set('expansion', String(filters.expansion));
  return `/tcg/sealed/market${params.size ? `?${params}` : ''}`;
}

/** Cardmarket's public sealed catalogue snapshot (2026-09-29), cross-checked against the FR release register. */
const CURATED_EXPANSIONS: Record<number, { en: string; fr: string }> = {
  5335: { en: 'Black Bolt + White Flare', fr: 'Foudre Noire + Flamme Blanche' },
  5546: { en: 'Paldean Fates', fr: 'Destinées de Paldea' },
  5589: { en: 'Temporal Forces', fr: 'Forces Temporelles' },
  5691: { en: 'Twilight Masquerade', fr: 'Mascarade Crépusculaire' },
  5760: { en: 'Shrouded Fable', fr: 'Fable Nébuleuse' },
  5802: { en: 'Stellar Crown', fr: 'Couronne Stellaire' },
  5879: { en: 'Surging Sparks', fr: 'Étincelles Déferlantes' },
  5944: { en: 'Prismatic Evolutions', fr: 'Évolutions Prismatiques' },
  6006: { en: 'Journey Together', fr: 'Aventures Ensemble' },
  6096: { en: 'Destined Rivals', fr: 'Rivalités Destinées' },
  6134: { en: 'Black Bolt', fr: 'Foudre Noire' },
  6135: { en: 'White Flare', fr: 'Flamme Blanche' },
  6209: { en: 'Mega Evolution', fr: 'Méga-Évolution' },
  6299: { en: 'Phantasmal Flames', fr: 'Flammes Fantasmagoriques' },
  6395: { en: 'Ascended Heroes', fr: 'Héros Transcendants' },
  6443: { en: 'Perfect Order', fr: 'Équilibre Parfait' },
  6517: { en: 'Chaos Rising', fr: 'Chaos Ascendant' },
  6569: { en: 'Pitch Black', fr: 'Nuit Noire' },
  6601: { en: '30th Celebration', fr: '30ᵉ Anniversaire' },
};

export function publicExpansionName(id: number, language: string, unknownLabel = `#${id}`): string {
  const curated = CURATED_EXPANSIONS[id];
  return curated ? language === 'fr' ? curated.fr : curated.en : unknownLabel;
}

export interface PublicPriceChange {
  currentCents: number | null;
  day: string | null;
  sourceAt: string | null;
  sevenDayPercent: number | null;
  thirtyDayPercent: number | null;
}

function sourceDay(sourceAt: string): string | null {
  const timestamp = Date.parse(sourceAt);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : null;
}

function dayDistance(later: string, earlier: string): number {
  return Math.round((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86_400_000);
}

export interface PublicPriceChartPoint {
  sourceAt: string;
  trendCents: number;
  x: number;
  y: number;
}

/** Uses only real Cardmarket source observations and preserves their actual time spacing. */
export function buildPublicPriceChartPoints(prices: readonly SealedPriceSnapshot[]): PublicPriceChartPoint[] {
  const valid = prices.flatMap((price) => {
    const value = price.metrics.trendCents;
    const timestamp = Date.parse(price.sourceAt);
    return Number.isSafeInteger(value) && (value ?? 0) > 0 && Number.isFinite(timestamp)
      ? [{ sourceAt: price.sourceAt, timestamp, trendCents: value as number }]
      : [];
  }).sort((a, b) => a.timestamp - b.timestamp);
  if (!valid.length) return [];
  const firstTimestamp = valid[0].timestamp;
  const elapsed = Math.max(1, valid.at(-1)!.timestamp - firstTimestamp);
  const min = Math.min(...valid.map((point) => point.trendCents));
  const range = Math.max(1, Math.max(...valid.map((point) => point.trendCents)) - min);
  return valid.map((point) => ({
    sourceAt: point.sourceAt,
    trendCents: point.trendCents,
    x: valid.length === 1 ? 50 : ((point.timestamp - firstTimestamp) / elapsed) * 100,
    y: 90 - ((point.trendCents - min) / range) * 80,
  }));
}

/** Historical comparisons require a recent current quote and a quote near the target date. */
export function summarizePublicPrice(prices: readonly SealedPriceSnapshot[], asOf: string): PublicPriceChange {
  const valid = prices.flatMap((price) => {
    const observedDay = sourceDay(price.sourceAt);
    const trendCents = price.metrics.trendCents;
    return observedDay && Number.isSafeInteger(trendCents) && (trendCents ?? 0) > 0 && observedDay <= asOf
      ? [{ price, observedDay }]
      : [];
  }).sort((a, b) => b.observedDay.localeCompare(a.observedDay)
    || Date.parse(b.price.sourceAt) - Date.parse(a.price.sourceAt));
  const current = valid[0];
  if (!current || dayDistance(asOf, current.observedDay) > 3) {
    return { currentCents: null, day: current?.observedDay ?? null, sourceAt: current?.price.sourceAt ?? null, sevenDayPercent: null, thirtyDayPercent: null };
  }
  const change = (days: number): number | null => {
    const previous = valid.find((point) => {
      const distance = dayDistance(current.observedDay, point.observedDay);
      return distance >= days && distance <= days + 3;
    });
    const previousCents = previous?.price.metrics.trendCents;
    const currentCents = current.price.metrics.trendCents;
    return previousCents && currentCents ? (currentCents - previousCents) / previousCents * 100 : null;
  };
  return {
    currentCents: current.price.metrics.trendCents,
    day: current.observedDay,
    sourceAt: current.price.sourceAt,
    sevenDayPercent: change(7),
    thirtyDayPercent: change(30),
  };
}
