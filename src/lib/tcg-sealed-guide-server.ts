import type { NeonSql } from '@/lib/neon/server';
import {
  buildGuideIndex,
  buildProductMovers,
  buildSeriesMovers,
  type GuideBasket,
  type GuideObservation,
  type GuideProduct,
} from '@/lib/tcg-sealed-guide';

const MAX_PRODUCTS = 10_000;
const MAX_INDEX_ROWS = 200_000;
const MAX_MOVER_ROWS = MAX_PRODUCTS * 2;
// No expansion ID has a reviewed Cardmarket-to-editorial crosswalk yet.
const SERIES: readonly { expansionId: number; name: string }[] = [];

interface ProductRow {
  cardmarket_product_id: number | string;
  name: string;
  expansion_id: number | string;
  active: boolean;
}

interface ObservationRow {
  cardmarket_product_id: number | string;
  day: string | Date;
  source_at: string | Date;
  trend_cents: number | string | null;
}

function timeText(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : String(value);
}

function sourceDay(sourceAt: string): string {
  const timestamp = Date.parse(sourceAt);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : '';
}

function parseBasket(value: unknown): GuideBasket | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 'launch-v1' || typeof candidate.day !== 'string' || typeof candidate.sourceAt !== 'string' || !Array.isArray(candidate.items)) return null;
  const items: GuideBasket['items'] = [];
  for (const raw of candidate.items) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    if (!Number.isSafeInteger(item.productId) || !Number.isSafeInteger(item.trendCents)) return null;
    items.push({ productId: item.productId as number, trendCents: item.trendCents as number });
  }
  return { version: 'launch-v1', day: candidate.day, sourceAt: candidate.sourceAt, items };
}

function mapObservation(row: ObservationRow): GuideObservation {
  const trendCents = row.trend_cents === null ? null : Number(row.trend_cents);
  const sourceAt = timeText(row.source_at);
  return {
    productId: Number(row.cardmarket_product_id),
    day: sourceDay(sourceAt),
    sourceAt,
    trendCents: trendCents !== null && Number.isSafeInteger(trendCents) ? trendCents : null,
  };
}

/** Bounded public read path; private ledger and portfolio tables are never consulted. */
export async function getPublicSealedGuide(sql: NeonSql, asOf: string) {
  const settingRows = await sql.query(`
    select value from public.tcg_sealed_settings where key = 'sealed_guide_basket_launch_v1' limit 1
  `, []) as unknown as Array<{ value: unknown }>;
  const basket = parseBasket(settingRows[0]?.value);
  const productRows = await sql.query(`
    select cardmarket_product_id, name, expansion_id, active
    from public.tcg_sealed_products
    where active = true
    order by cardmarket_product_id asc
    limit ${MAX_PRODUCTS + 1}
  `, []) as unknown as ProductRow[];
  if (productRows.length > MAX_PRODUCTS) throw new Error('The public sealed guide catalogue exceeds its bounded read.');
  const products: GuideProduct[] = productRows.map((row) => ({
    id: Number(row.cardmarket_product_id), name: row.name, expansionId: Number(row.expansion_id), active: row.active,
  }));
  const asOfStart = Date.parse(`${asOf}T00:00:00.000Z`);
  if (!Number.isFinite(asOfStart)) throw new Error('Invalid sealed guide observation date.');
  const since = new Date(asOfStart - 30 * 86_400_000).toISOString();
  const until = new Date(asOfStart + 86_400_000).toISOString();
  const indexRows = basket ? await sql.query(`
    select cardmarket_product_id, day::text, source_at::text, trend_cents
    from public.tcg_sealed_price_snapshots
    where cardmarket_product_id = any($1::int[]) and source_at >= $2::timestamptz and source_at < $3::timestamptz
      and trend_cents > 0
    order by source_at asc, cardmarket_product_id asc
    limit ${MAX_INDEX_ROWS + 1}
  `, [basket.items.map((item) => item.productId), since, until]) as unknown as ObservationRow[] : [];
  if (indexRows.length > MAX_INDEX_ROWS) throw new Error('The public sealed guide history exceeds its bounded read.');
  const moverRows = await sql.query(`
    select s.cardmarket_product_id, s.day::text, s.source_at::text, s.trend_cents
    from unnest($1::int[]) as product_ids(cardmarket_product_id)
    cross join lateral (
      select cardmarket_product_id, day, source_at, trend_cents
      from public.tcg_sealed_price_snapshots
      where cardmarket_product_id = product_ids.cardmarket_product_id and source_at < $2::timestamptz and trend_cents > 0
      order by source_at desc
      limit 2
    ) s
    order by s.cardmarket_product_id asc, s.source_at desc
    limit ${MAX_MOVER_ROWS + 1}
  `, [products.map((product) => product.id), until]) as unknown as ObservationRow[];
  if (moverRows.length > MAX_MOVER_ROWS) throw new Error('The public sealed movers exceed their bounded read.');
  const observations = moverRows.map(mapObservation);
  return {
    asOf,
    index: buildGuideIndex(indexRows.map(mapObservation), basket, asOf),
    products: buildProductMovers(products, observations, asOf),
    series: buildSeriesMovers(products, observations, asOf, SERIES),
  };
}
