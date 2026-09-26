import { randomUUID } from 'node:crypto';
import {
  calculateSealedCashCents,
  replaySealedLedger,
  validateSealedTransaction,
  validateSealedTransactionDraft,
} from '@primedex/core/lib/sealed-ledger';
import {
  calculateSealedCashflow,
  sealedHistoryDays,
  summarizeSealedPortfolio,
} from '@primedex/core/lib/sealed-analytics';
import { getSealedCardmarketUrl, getSealedImageCandidates, parseSealedCatalogueSearch } from '@primedex/core/lib/sealed-catalogue';
import { isSealedDate, selectSealedValuation } from '@primedex/core/lib/sealed-ledger';
import { SEALED_PRODUCT_CATEGORY_IDS } from '@primedex/core/types/sealed';
import type {
  SealedPriceMetrics,
  SealedPriceSnapshot,
  SealedPortfolioPoint,
  SealedProduct,
  SealedProductLanguage,
  SealedSourceStatus,
  SealedTransaction,
  SealedTransactionDraft,
} from '@primedex/core/types/sealed';
import type { NeonSql } from '@/lib/neon/server';
import {
  downloadAndParseSealedCardmarketData,
  SEALED_CARDMARKET_SOURCES,
  type DownloadedCardmarketData,
} from '@/lib/tcg-sealed-cardmarket';
import {
  mergeSealedPortfolioHistory,
  parseSealedPortfolioDailyPoint,
  type SealedPortfolioDailyRow,
} from '@/lib/tcg-sealed-history';

const SEALED_CATEGORY_SQL = [...SEALED_PRODUCT_CATEGORY_IDS];
const MAX_CATALOGUE_PAGE_SIZE = 48;
const MAX_CATALOGUE_PAGE = 10_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const SEALED_NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export class SealedServerError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'SealedServerError';
  }
}

export class SealedConflictError extends SealedServerError {
  constructor(message = 'The sealed portfolio changed. Reload and try again.') {
    super(message, 409);
    this.name = 'SealedConflictError';
  }
}

export class SealedNotFoundError extends SealedServerError {
  constructor(message = 'Sealed portfolio record not found.') {
    super(message, 404);
    this.name = 'SealedNotFoundError';
  }
}

interface SealedTransactionRow {
  id: string;
  revision: number | string;
  kind: string;
  cardmarket_product_id: number | string;
  exchange_give_product_id: number | string | null;
  exchange_give_language: string | null;
  exchange_give_quantity: number | string | null;
  language: string;
  date: string | Date;
  quantity: number | string;
  unit_price_cents: number | string;
  fees_cents: number | string;
  shipping_cents: number | string;
  discount_cents: number | string;
  payment_fees_cents: number | string;
  other_costs_cents: number | string;
  platform: string;
  counterparty: string;
  notes: string;
  storage: string;
  allocation_method: string;
  selections: unknown;
  voided: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}

interface SealedProductRow {
  cardmarket_product_id: number | string;
  name: string;
  category_id: number | string;
  category_name: string;
  expansion_id: number | string;
  cardmarket_url: string;
  image_available: boolean;
  source_at: string | Date;
  updated_at: string | Date;
  active: boolean;
  alias: string | null;
}

interface SealedPriceRow {
  cardmarket_product_id: number | string;
  day: string | Date;
  source_at: string | Date;
  fetched_at: string | Date;
  avg_cents: number | string | null;
  low_cents: number | string | null;
  trend_cents: number | string | null;
  avg1_cents: number | string | null;
  avg7_cents: number | string | null;
  avg30_cents: number | string | null;
}

interface RevisionRow { revision: number | string; }

interface SettingRow { key: string; value: unknown; }

interface SyncRunRow {
  id: string;
  started_at: string | Date;
  finished_at: string | Date | null;
  status: 'running' | 'success' | 'failed';
  details: unknown;
}

interface LastSyncDetails {
  catalogue_source_at?: string;
  price_source_at?: string;
  fetched_at?: string;
  catalogue_count?: number;
  guide_count?: number;
  matched?: number;
  catalogue_sha256?: string;
  price_sha256?: string;
  error?: string;
  [key: string]: unknown;
}

function numberValue(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && Number.isSafeInteger(number) ? number : null;
}

function requiredNumber(value: number | string): number {
  const number = numberValue(value);
  if (number === null) throw new Error('Invalid sealed numeric database value.');
  return number;
}

function textValue(value: string | Date | null): string {
  if (value === null) return '';
  return value instanceof Date ? value.toISOString() : String(value);
}

function dayValue(value: string | Date): string {
  const text = textValue(value);
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function parseSelections(value: unknown): SealedTransaction['selections'] {
  const candidate = typeof value === 'string'
    ? (() => {
      try { return JSON.parse(value) as unknown; } catch { return null; }
    })()
    : value;
  if (!Array.isArray(candidate)) return [];
  return candidate.map((selection) => {
    const row = jsonObject(selection);
    return {
      lotId: typeof row.lotId === 'string' ? row.lotId : '',
      quantity: typeof row.quantity === 'number' ? row.quantity : Number(row.quantity),
    };
  });
}

function mapTransaction(row: SealedTransactionRow): SealedTransaction {
  const hasExchangeGive = row.exchange_give_product_id !== null
    || row.exchange_give_language !== null
    || row.exchange_give_quantity !== null;
  const exchangeGive = hasExchangeGive
    ? {
      cardmarketProductId: row.exchange_give_product_id === null ? 0 : requiredNumber(row.exchange_give_product_id),
      language: row.exchange_give_language ?? '',
      quantity: row.exchange_give_quantity === null ? 0 : requiredNumber(row.exchange_give_quantity),
    }
    : undefined;
  const transaction = {
    id: row.id,
    revision: requiredNumber(row.revision),
    kind: row.kind,
    cardmarketProductId: requiredNumber(row.cardmarket_product_id),
    language: row.language,
    exchangeGive,
    date: dayValue(row.date),
    quantity: requiredNumber(row.quantity),
    unitPriceCents: requiredNumber(row.unit_price_cents),
    feesCents: requiredNumber(row.fees_cents),
    shippingCents: requiredNumber(row.shipping_cents),
    discountCents: requiredNumber(row.discount_cents),
    paymentFeesCents: requiredNumber(row.payment_fees_cents),
    otherCostsCents: requiredNumber(row.other_costs_cents),
    platform: row.platform,
    counterparty: row.counterparty,
    notes: row.notes,
    storage: row.storage,
    allocationMethod: row.allocation_method,
    selections: parseSelections(row.selections),
    createdAt: textValue(row.created_at),
    updatedAt: textValue(row.updated_at),
    voided: row.voided,
  } as unknown;
  return validateSealedTransaction(transaction);
}

function mapProduct(row: SealedProductRow): SealedProduct {
  return {
    cardmarketProductId: requiredNumber(row.cardmarket_product_id),
    name: row.name,
    categoryId: requiredNumber(row.category_id),
    categoryName: row.category_name,
    expansionId: requiredNumber(row.expansion_id),
    cardmarketUrl: getSealedCardmarketUrl(requiredNumber(row.cardmarket_product_id)),
    imageAvailable: row.image_available,
    sourceAt: textValue(row.source_at),
    updatedAt: textValue(row.updated_at),
    active: row.active,
    ...(row.alias ? { alias: row.alias } : {}),
  };
}

function mapPrice(row: SealedPriceRow): SealedPriceSnapshot {
  const metric = (value: number | string | null): number | null => numberValue(value);
  const metrics: SealedPriceMetrics = {
    avgCents: metric(row.avg_cents),
    lowCents: metric(row.low_cents),
    trendCents: metric(row.trend_cents),
    avg1Cents: metric(row.avg1_cents),
    avg7Cents: metric(row.avg7_cents),
    avg30Cents: metric(row.avg30_cents),
  };
  return {
    cardmarketProductId: requiredNumber(row.cardmarket_product_id),
    day: dayValue(row.day),
    sourceAt: textValue(row.source_at),
    fetchedAt: textValue(row.fetched_at),
    metrics,
  };
}

function mapSyncRun(row: SyncRunRow) {
  return {
    id: row.id,
    startedAt: textValue(row.started_at),
    finishedAt: row.finished_at ? textValue(row.finished_at) : null,
    status: row.status,
    details: jsonObject(row.details),
  };
}

export function isSealedUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function normalizeSealedDraft(input: unknown): SealedTransactionDraft {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new SealedServerError('Invalid sealed transaction payload.', 400);
  }
  const value = input as Record<string, unknown>;
  const selections = value.selections === undefined ? [] : value.selections;
  if (selections !== undefined && !Array.isArray(selections)) {
    throw new SealedServerError('Invalid lot selections.', 400);
  }
  try {
    return validateSealedTransactionDraft({
      kind: value.kind,
      cardmarketProductId: value.cardmarketProductId,
      language: value.language ?? 'unknown',
      exchangeGive: value.exchangeGive,
      date: value.date,
      quantity: value.quantity,
      unitPriceCents: value.unitPriceCents ?? (value.kind === 'exchange' ? 0 : undefined),
      feesCents: value.feesCents ?? 0,
      shippingCents: value.shippingCents ?? 0,
      discountCents: value.discountCents ?? 0,
      paymentFeesCents: value.paymentFeesCents ?? 0,
      otherCostsCents: value.otherCostsCents ?? 0,
      platform: value.platform ?? '',
      counterparty: value.counterparty ?? '',
      notes: value.notes ?? '',
      storage: value.storage ?? '',
      allocationMethod: value.allocationMethod ?? 'fifo',
      selections,
    });
  } catch (error) {
    if (error instanceof SealedServerError) throw error;
    throw new SealedServerError(error instanceof Error ? error.message : 'Invalid sealed transaction payload.', 400);
  }
}

export async function getSealedTransactions(
  sql: NeonSql,
  userId: string,
  productId?: number,
): Promise<SealedTransaction[]> {
  const rows = productId === undefined
      ? await sql`
        select id::text, revision, kind, cardmarket_product_id, language, date::text,
          exchange_give_product_id, exchange_give_language, exchange_give_quantity,
          quantity, unit_price_cents, fees_cents, shipping_cents, discount_cents,
          payment_fees_cents, other_costs_cents, platform, counterparty, notes,
          storage, allocation_method, selections, voided, created_at::text, updated_at::text
        from public.tcg_sealed_transactions
        where user_id = ${userId}::uuid
        order by date asc, created_at asc, id asc
      ` as SealedTransactionRow[]
    : await sql`
        select id::text, revision, kind, cardmarket_product_id, language, date::text,
          exchange_give_product_id, exchange_give_language, exchange_give_quantity,
          quantity, unit_price_cents, fees_cents, shipping_cents, discount_cents,
          payment_fees_cents, other_costs_cents, platform, counterparty, notes,
          storage, allocation_method, selections, voided, created_at::text, updated_at::text
        from public.tcg_sealed_transactions
        where user_id = ${userId}::uuid
          and (
            cardmarket_product_id = ${productId}
            or exchange_give_product_id = ${productId}
          )
        order by date asc, created_at asc, id asc
      ` as SealedTransactionRow[];
  return rows.map(mapTransaction);
}

export interface SealedTransactionPageOptions {
  limit: number;
  cursor?: { date: string; createdAt: string; id: string };
  productId?: number;
  language?: string;
  kind?: 'buy' | 'sell' | 'exchange';
  includeVoided?: boolean;
  voided?: boolean;
}

export async function getSealedTransactionPage(
  sql: NeonSql,
  userId: string,
  options: SealedTransactionPageOptions,
): Promise<{ transactions: SealedTransaction[]; hasMore: boolean }> {
  const params: unknown[] = [userId];
  const clauses = ['user_id = $1::uuid'];
  if (options.voided !== undefined) {
    params.push(options.voided);
    clauses.push(`voided = $${params.length}`);
  } else if (!options.includeVoided) {
    clauses.push('voided = false');
  }
  if (options.productId !== undefined) {
    params.push(options.productId);
    clauses.push(`(cardmarket_product_id = $${params.length} or exchange_give_product_id = $${params.length})`);
  }
  if (options.language !== undefined) {
    params.push(options.language);
    clauses.push(`(language = $${params.length} or exchange_give_language = $${params.length})`);
  }
  if (options.kind !== undefined) {
    params.push(options.kind);
    clauses.push(`kind = $${params.length}`);
  }
  if (options.cursor) {
    params.push(options.cursor.date, options.cursor.createdAt, options.cursor.id);
    clauses.push(`(date, created_at, id) < ($${params.length - 2}::date, $${params.length - 1}::timestamptz, $${params.length}::uuid)`);
  }
  params.push(options.limit + 1);
  const rows = await sql.query(`
    select id::text, revision, kind, cardmarket_product_id, language, date::text,
      exchange_give_product_id, exchange_give_language, exchange_give_quantity,
      quantity, unit_price_cents, fees_cents, shipping_cents, discount_cents,
      payment_fees_cents, other_costs_cents, platform, counterparty, notes,
      storage, allocation_method, selections, voided, created_at::text, updated_at::text
    from public.tcg_sealed_transactions
    where ${clauses.join(' and ')}
    order by date desc, created_at desc, id desc
    limit $${params.length}
  `, params) as unknown as SealedTransactionRow[];
  const hasMore = rows.length > options.limit;
  return { transactions: rows.slice(0, options.limit).map(mapTransaction), hasMore };
}

export async function getSealedTransaction(
  sql: NeonSql,
  userId: string,
  id: string,
): Promise<SealedTransaction | null> {
  const rows = await sql`
    select id::text, revision, kind, cardmarket_product_id, language, date::text,
      exchange_give_product_id, exchange_give_language, exchange_give_quantity,
      quantity, unit_price_cents, fees_cents, shipping_cents, discount_cents,
      payment_fees_cents, other_costs_cents, platform, counterparty, notes,
      storage, allocation_method, selections, voided, created_at::text, updated_at::text
    from public.tcg_sealed_transactions
    where user_id = ${userId}::uuid and id = ${id}::uuid
    limit 1
  ` as SealedTransactionRow[];
  return rows[0] ? mapTransaction(rows[0]) : null;
}

export async function getSealedRevision(sql: NeonSql, userId: string): Promise<number> {
  const [, rows] = await sql.transaction((tx) => [
    tx`
      insert into public.tcg_sealed_user_revisions (user_id, revision)
      values (${userId}::uuid, 0)
      on conflict (user_id) do nothing
    `,
    tx`
      select revision
      from public.tcg_sealed_user_revisions
      where user_id = ${userId}::uuid
      limit 1
    `,
  ]) as [unknown[], RevisionRow[]];
  return requiredNumber(rows[0]?.revision ?? 0);
}

export async function getSealedPriceRevision(sql: NeonSql): Promise<number> {
  const rows = await sql`
    select value
    from public.tcg_sealed_settings
    where key = 'price_revision'
    limit 1
  ` as SettingRow[];
  const value = rows[0]?.value;
  const revision = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
}

export async function getSealedProducts(
  sql: NeonSql,
  userId: string,
  ids?: readonly number[],
  activeOnly = false,
): Promise<SealedProduct[]> {
  const params: unknown[] = [userId];
  let query = `
    select p.cardmarket_product_id, p.name, p.category_id, p.category_name,
      p.expansion_id, p.cardmarket_url, p.image_available, p.source_at::text,
      p.updated_at::text, p.active, a.alias
    from public.tcg_sealed_products p
    left join public.tcg_sealed_aliases a
      on a.cardmarket_product_id = p.cardmarket_product_id
      and a.user_id = $1::uuid
    where 1 = 1`;
  if (activeOnly) query += ' and p.active = true';
  if (ids) {
    params.push([...ids]);
    query += ` and p.cardmarket_product_id = any($${params.length}::int[])`;
  }
  query += ' order by p.name asc, p.cardmarket_product_id asc';
  const rows = await sql.query(query, params) as unknown as SealedProductRow[];
  return rows.map(mapProduct);
}

export async function getSealedPrices(
  sql: NeonSql,
  ids: readonly number[],
  from?: string,
): Promise<SealedPriceSnapshot[]> {
  if (ids.length === 0) return [];
  const params: unknown[] = [[...ids]];
  let query = `
    select cardmarket_product_id, day::text, source_at::text, fetched_at::text,
      avg_cents, low_cents, trend_cents, avg1_cents, avg7_cents, avg30_cents
    from public.tcg_sealed_price_snapshots
    where cardmarket_product_id = any($1::int[])`;
  if (from) {
    params.push(from);
    query += ` and day >= $${params.length}::date`;
  }
  query += ' order by day asc, cardmarket_product_id asc';
  const rows = await sql.query(query, params) as unknown as SealedPriceRow[];
  return rows.map(mapPrice);
}

/** Loads only the six dates needed for current value and 1/7/30-day deltas. */
export async function getSealedCurrentPortfolio(sql: NeonSql, userId: string, asOf: string) {
  const transactions = await getSealedTransactions(sql, userId);
  const ids = [...new Set(transactions.flatMap((transaction) => [
    transaction.cardmarketProductId,
    ...(transaction.exchangeGive ? [transaction.exchangeGive.cardmarketProductId] : []),
  ]))];
  const days = [0, 1, 2, 3, 7, 30].map((offset) => {
    const date = new Date(`${asOf}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - offset);
    return date.toISOString().slice(0, 10);
  });
  const [products, priceRows, revision, priceRevision] = await Promise.all([
    getSealedProducts(sql, userId, ids),
    ids.length === 0 ? Promise.resolve([] as SealedPriceRow[]) : sql.query(`
      select cardmarket_product_id, day::text, source_at::text, fetched_at::text,
        avg_cents, low_cents, trend_cents, avg1_cents, avg7_cents, avg30_cents
      from (
        select cardmarket_product_id, day, source_at, fetched_at,
        avg_cents, low_cents, trend_cents, avg1_cents, avg7_cents, avg30_cents
        from public.tcg_sealed_price_snapshots
        where cardmarket_product_id = any($1::int[])
          and day = any($2::date[])
        union
        select cardmarket_product_id, day, source_at, fetched_at,
          avg_cents, low_cents, trend_cents, avg1_cents, avg7_cents, avg30_cents
        from (
          select distinct on (cardmarket_product_id)
            cardmarket_product_id, day, source_at, fetched_at,
            avg_cents, low_cents, trend_cents, avg1_cents, avg7_cents, avg30_cents
          from public.tcg_sealed_price_snapshots
          where cardmarket_product_id = any($1::int[])
            and day <= $3::date
          order by cardmarket_product_id, day desc
        ) latest_prices
      ) selected_prices
    `, [ids, days, asOf]) as unknown as SealedPriceRow[],
    getSealedRevision(sql, userId),
    getSealedPriceRevision(sql),
  ]);
  const prices = priceRows.map(mapPrice);
  const summary = summarizeSealedPortfolio(transactions, products, prices, asOf);
  return { summary, revision, priceRevision };
}

export async function searchSealedCatalogue(
  sql: NeonSql,
  userId: string,
  queryText: string,
  page: number,
  pageSize = 24,
) {
  const search = parseSealedCatalogueSearch(queryText.slice(0, 150));
  const boundedPage = Number.isSafeInteger(page) && page >= 0 ? Math.min(page, MAX_CATALOGUE_PAGE) : 0;
  const boundedSize = Math.min(MAX_CATALOGUE_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
  const params: unknown[] = [userId];
  const clauses: string[] = ['p.active = true', `p.category_id = any($${params.length + 1}::int[])`];
  params.push(SEALED_CATEGORY_SQL);
  for (const term of search.terms) {
    params.push(term);
    const parameter = `$${params.length}`;
    clauses.push(`(
      p.name ilike '%' || ${parameter} || '%'
      or coalesce(a.alias, '') ilike '%' || ${parameter} || '%'
      or p.category_name ilike '%' || ${parameter} || '%'
      or p.cardmarket_product_id::text = ${parameter}
      or p.expansion_id::text = ${parameter}
    )`);
  }
  if (search.expansionId !== undefined) {
    params.push(search.expansionId);
    clauses.push(`p.expansion_id = $${params.length}`);
  }
  const where = clauses.join(' and ');
  const limitParameter = params.length + 1;
  const offsetParameter = params.length + 2;
  const rows = await sql.query(`
    select p.cardmarket_product_id, p.name, p.category_id, p.category_name,
      p.expansion_id, p.cardmarket_url, p.image_available, p.source_at::text,
      p.updated_at::text, p.active, a.alias
    from public.tcg_sealed_products p
    left join public.tcg_sealed_aliases a
      on a.cardmarket_product_id = p.cardmarket_product_id
      and a.user_id = $1::uuid
    where ${where}
    order by p.name asc, p.cardmarket_product_id asc
    limit $${limitParameter} offset $${offsetParameter}
  `, [...params, boundedSize, boundedPage * boundedSize]) as unknown as SealedProductRow[];
  const countRows = await sql.query(`
    select count(*)::int as count
    from public.tcg_sealed_products p
    left join public.tcg_sealed_aliases a
      on a.cardmarket_product_id = p.cardmarket_product_id
      and a.user_id = $1::uuid
    where ${where}
  `, params) as unknown as Array<{ count: number | string }>;
  const products = rows.map(mapProduct);
  const prices = await getSealedPrices(sql, products.map((product) => product.cardmarketProductId), new Date(Date.now() - 35 * 86_400_000).toISOString().slice(0, 10));
  return {
    products,
    prices,
    total: Number(countRows[0]?.count ?? 0),
    page: boundedPage,
    pageSize: boundedSize,
  };
}

/** Public catalogue search. This deliberately reads only global catalogue and price data. */
export async function searchPublicSealedCatalogue(
  sql: NeonSql,
  queryText: string,
  page: number,
  pageSize = 24,
) {
  const search = parseSealedCatalogueSearch(queryText.slice(0, 150));
  const boundedPage = Number.isSafeInteger(page) && page >= 0 ? Math.min(page, MAX_CATALOGUE_PAGE) : 0;
  const boundedSize = Math.min(MAX_CATALOGUE_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
  const params: unknown[] = [SEALED_CATEGORY_SQL];
  const clauses: string[] = ['p.active = true', 'p.category_id = any($1::int[])'];
  for (const term of search.terms) {
    params.push(term);
    const parameter = `$${params.length}`;
    clauses.push(`(
      p.name ilike '%' || ${parameter} || '%'
      or p.category_name ilike '%' || ${parameter} || '%'
      or p.cardmarket_product_id::text = ${parameter}
      or p.expansion_id::text = ${parameter}
    )`);
  }
  if (search.expansionId !== undefined) {
    params.push(search.expansionId);
    clauses.push(`p.expansion_id = $${params.length}`);
  }
  const where = clauses.join(' and ');
  const limitParameter = params.length + 1;
  const offsetParameter = params.length + 2;
  const rows = await sql.query(`
    select p.cardmarket_product_id, p.name, p.category_id, p.category_name,
      p.expansion_id, p.cardmarket_url, p.image_available, p.source_at::text,
      p.updated_at::text, p.active, null::text as alias
    from public.tcg_sealed_products p
    where ${where}
    order by p.name asc, p.cardmarket_product_id asc
    limit $${limitParameter} offset $${offsetParameter}
  `, [...params, boundedSize, boundedPage * boundedSize]) as unknown as SealedProductRow[];
  const countRows = await sql.query(`
    select count(*)::int as count
    from public.tcg_sealed_products p
    where ${where}
  `, params) as unknown as Array<{ count: number | string }>;
  const products = rows.map(mapProduct);
  const prices = await getSealedPrices(sql, products.map((product) => product.cardmarketProductId), new Date(Date.now() - 35 * 86_400_000).toISOString().slice(0, 10));
  return {
    products,
    prices,
    total: Number(countRows[0]?.count ?? 0),
    page: boundedPage,
    pageSize: boundedSize,
  };
}

async function loadSealedPortfolio(sql: NeonSql, userId: string) {
  const transactions = await getSealedTransactions(sql, userId);
  const ids = [...new Set(transactions.flatMap((transaction) => [
    transaction.cardmarketProductId,
    ...(transaction.exchangeGive ? [transaction.exchangeGive.cardmarketProductId] : []),
  ]))];
  const [products, prices] = await Promise.all([
    getSealedProducts(sql, userId, ids),
    getSealedPrices(sql, ids),
  ]);
  return { transactions, products, prices };
}

export async function getSealedPortfolioDaily(
  sql: NeonSql,
  userId: string,
  from: string,
  to: string,
): Promise<SealedPortfolioPoint[]> {
  const rows = from === '0000-01-01'
    ? await sql`
      select day::text, data
      from public.tcg_sealed_portfolio_daily
      where user_id = ${userId}::uuid
        and day <= ${to}::date
      order by day asc
    `
    : await sql`
      select day::text, data
      from public.tcg_sealed_portfolio_daily
      where user_id = ${userId}::uuid
        and day >= ${from}::date
        and day <= ${to}::date
      order by day asc
    `;
  return (rows as unknown as SealedPortfolioDailyRow[]).flatMap((row) => {
    const point = parseSealedPortfolioDailyPoint(row);
    return point ? [point] : [];
  });
}

function validRange(from: string, to: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return isSealedDate(from) && isSealedDate(to) && from <= to && to <= today;
}

export async function getSealedOverview(
  sql: NeonSql,
  userId: string,
  options: { from?: string; to?: string; group?: 'day' | 'month' | 'year' } = {},
) {
  const from = options.from ?? '0000-01-01';
  const to = options.to ?? new Date().toISOString().slice(0, 10);
  const group = options.group ?? 'month';
  if (!validRange(from, to) || !['day', 'month', 'year'].includes(group)) {
    throw new SealedServerError('Invalid overview date range.', 400);
  }
  const [{ transactions, products, prices }, revision, priceRevision] = await Promise.all([
    loadSealedPortfolio(sql, userId),
    getSealedRevision(sql, userId),
    getSealedPriceRevision(sql),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const current = summarizeSealedPortfolio(transactions, products, prices, today);
  const atEnd = summarizeSealedPortfolio(transactions, products, prices, to);
  const priceDays = sealedHistoryDays(prices, from, to);
  const historyDays = priceDays.length <= 366
    ? priceDays
    : priceDays.filter((_, index) => index % Math.ceil(priceDays.length / 366) === 0 || index === priceDays.length - 1);
  const computedPoints = historyDays.map((day) => ({
    day,
    ...summarizeSealedPortfolio(transactions, products, prices, day).totals,
  }));
  const currentPoint = { day: today, ...current.totals };
  const pointsForCache = mergeSealedPortfolioHistory([], [...computedPoints, currentPoint], '0000-01-01', today);
  const pointsForResponse = mergeSealedPortfolioHistory([], pointsForCache, from, to);
  let historyPoints = pointsForResponse;
  const cashflow = calculateSealedCashflow(transactions, from, to, group);
  const selected = transactions.filter((transaction) => !transaction.voided && transaction.date >= from && transaction.date <= to);
  const periodSales = current.sales.filter((sale) => sale.transaction.date >= from && sale.transaction.date <= to);
  const beforePeriod = from === '0000-01-01'
    ? null
    : summarizeSealedPortfolio(transactions, products, prices, new Date(Date.parse(`${from}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10));
  const recent = [1, 7, 30].map((daysAgo) => {
    const day = new Date(Date.parse(`${today}T00:00:00Z`) - daysAgo * 86_400_000).toISOString().slice(0, 10);
    const previous = summarizeSealedPortfolio(transactions, products, prices, day).totals;
    return {
      days: daysAgo,
      day,
      valueCents: previous.valueCents,
      deltaCents: previous.valueCents === null || current.totals.valueCents === null
        ? null
        : current.totals.valueCents - previous.valueCents,
    };
  });
  const [syncResult, settingResult] = await Promise.all([
    sql`
      select id::text, started_at::text, finished_at::text, status, details
      from public.tcg_sealed_sync_runs
      order by started_at desc
      limit 10
    `,
    sql`
      select key, value
      from public.tcg_sealed_settings
      where key = 'last_sync'
      limit 1
    `,
  ]);
  const syncRows = syncResult as unknown as SyncRunRow[];
  const settingRows = settingResult as unknown as SettingRow[];
  const lastSync = settingRows[0] ? jsonObject(settingRows[0].value) : null;
  try {
    if (pointsForCache.length > 0) {
      await sql`
        insert into public.tcg_sealed_portfolio_daily
          (user_id, day, transaction_revision, price_revision, data)
        select
          ${userId}::uuid,
          (point->>'day')::date,
          ${revision},
          ${priceRevision},
          point
        from jsonb_array_elements(${JSON.stringify(pointsForCache)}::jsonb) as point
        on conflict (user_id, day) do update set
          transaction_revision = excluded.transaction_revision,
          price_revision = excluded.price_revision,
          data = excluded.data
        where public.tcg_sealed_portfolio_daily.transaction_revision <> excluded.transaction_revision
          or public.tcg_sealed_portfolio_daily.price_revision <> excluded.price_revision
      `;
    }
    const cachedRows = await getSealedPortfolioDaily(sql, userId, from, to);
    historyPoints = mergeSealedPortfolioHistory(cachedRows, pointsForResponse, from, to);
  } catch {
    // The cache is an optimization. A failed read or write must never hide
    // the deterministic replay result returned above.
  }
  return {
    revision,
    priceRevision,
    totals: current.totals,
    positions: current.positions,
    lots: current.lots,
    sales: current.sales,
    exchanges: current.exchanges,
    history: historyPoints,
    recent,
    cashflow,
    period: {
      from,
      to,
      buysCents: selected.filter((transaction) => transaction.kind === 'buy').reduce((sum, transaction) => sum - calculateSealedCashCents(transaction), 0),
      netSalesCents: periodSales.reduce((sum, sale) => sum + sale.netCents, 0),
      realizedCents: periodSales.reduce((sum, sale) => sum + sale.profitCents, 0),
      cashFlowCents: selected.reduce((sum, transaction) => sum + calculateSealedCashCents(transaction), 0),
      endStockCostCents: atEnd.totals.costCents,
      valueChangeCents: beforePeriod?.totals.valueCents === null || beforePeriod?.totals.valueCents === undefined || atEnd.totals.valueCents === null
        ? null
        : atEnd.totals.valueCents - beforePeriod.totals.valueCents,
    },
    sync: syncRows.map(mapSyncRun),
    lastSync,
  };
}

export function summarizeSealedProductDetail(
  transactions: readonly SealedTransaction[],
  products: readonly SealedProduct[],
  prices: readonly SealedPriceSnapshot[],
  productId: number,
  asOf: string,
): ReturnType<typeof summarizeSealedPortfolio> {
  const fullSummary = summarizeSealedPortfolio(transactions, products, prices, asOf);
  const positions = fullSummary.positions.filter((position) => position.cardmarketProductId === productId);
  const lots = fullSummary.lots.filter((lot) => lot.transaction.cardmarketProductId === productId);
  const sales = fullSummary.sales.filter((sale) => sale.transaction.cardmarketProductId === productId);
  const exchanges = fullSummary.exchanges.filter((exchange) => (
    exchange.transaction.cardmarketProductId === productId
    || exchange.transaction.exchangeGive?.cardmarketProductId === productId
  ));
  const sum = <K extends keyof typeof positions[number]>(key: K): number => (
    positions.reduce((total, position) => total + Number(position[key]), 0)
  );
  const missingPrices = positions.filter((position) => position.quantity > 0 && position.valueCents === null);
  const knownValueCents = positions.reduce((total, position) => total + (position.valueCents ?? 0), 0);
  const valueCents = missingPrices.length > 0 ? null : knownValueCents;
  const latentCents = valueCents === null ? null : valueCents - sum('costCents');
  const realizedCents = sum('realizedCents');
  const totalCents = latentCents === null ? null : realizedCents + latentCents;
  const sold = sum('sold');
  const bought = sum('bought');
  const totals = {
    units: sum('quantity'),
    costCents: sum('costCents'),
    valueCents,
    latentCents,
    realizedCents,
    totalCents,
    spentCents: sum('spentCents'),
    grossSalesCents: sum('grossSalesCents'),
    netSalesCents: sum('netSalesCents'),
    buyFeesCents: sum('buyFeesCents'),
    sellFeesCents: sum('sellFeesCents'),
    bought,
    sold,
    exchangeIn: sum('exchangeIn'),
    exchangeOut: sum('exchangeOut'),
    distinct: positions.filter((position) => position.quantity > 0).length,
    missingPrices: missingPrices.length,
    roi: totalCents === null || sum('spentCents') === 0 ? null : (totalCents / sum('spentCents')) * 100,
    cashFlowCents: sum('netSalesCents') - sum('spentCents'),
    soldCostCents: sales.reduce((total, sale) => total + sale.costCents, 0),
    averageEntryCents: bought > 0 ? sum('spentCents') / bought : null,
    averageExitCents: sold > 0 ? sum('grossSalesCents') / sold : null,
    holdingDays: sold > 0
      ? sales.reduce((total, sale) => total + sale.holdingDays * sale.transaction.quantity, 0) / sold
      : null,
    winningSales: sales.length > 0 ? (sales.filter((sale) => sale.profitCents > 0).length / sales.length) * 100 : null,
    losingSales: sales.length > 0 ? (sales.filter((sale) => sale.profitCents < 0).length / sales.length) * 100 : null,
    profitPerSoldUnitCents: sold > 0 ? realizedCents / sold : null,
    sellThrough: bought > 0 ? (sold / bought) * 100 : null,
  } satisfies ReturnType<typeof summarizeSealedPortfolio>['totals'];
  return { positions, lots, sales, exchanges, totals };
}

export async function getSealedProductDetail(sql: NeonSql, userId: string, id: number) {
  const allTransactions = await getSealedTransactions(sql, userId);
  const transactions = allTransactions.filter((transaction) => (
    transaction.cardmarketProductId === id
    || transaction.exchangeGive?.cardmarketProductId === id
  ));
  const productIds = [...new Set([
    id,
    ...allTransactions.flatMap((transaction) => [
      transaction.cardmarketProductId,
      ...(transaction.exchangeGive ? [transaction.exchangeGive.cardmarketProductId] : []),
    ]),
  ])];
  const [allProducts, prices] = await Promise.all([
    getSealedProducts(sql, userId, productIds),
    getSealedPrices(sql, [id]),
  ]);
  const product = allProducts.find((candidate) => candidate.cardmarketProductId === id);
  if (!product) throw new SealedNotFoundError('Sealed product not found.');
  const relatedProductIds = new Set([
    id,
    ...transactions.flatMap((transaction) => [
      transaction.cardmarketProductId,
      ...(transaction.exchangeGive ? [transaction.exchangeGive.cardmarketProductId] : []),
    ]),
  ]);
  const products = allProducts.filter((candidate) => relatedProductIds.has(candidate.cardmarketProductId));
  const productPrices = prices.filter((price) => price.cardmarketProductId === id);
  const summary = summarizeSealedProductDetail(
    allTransactions,
    allProducts,
    prices,
    id,
    new Date().toISOString().slice(0, 10),
  );
  const valuation = selectSealedValuation(productPrices);
  const trendValues = productPrices.map((price) => price.metrics.trendCents).filter((value): value is number => value !== null);
  const changeSince = (day: string | null | undefined) => {
    if (!day) return null;
    const first = productPrices.find((price) => price.day === day);
    const last = productPrices.at(-1);
    if (!first || !last || first.metrics.trendCents === null || first.metrics.trendCents <= 0 || last.metrics.trendCents === null) return null;
    return { metric: 'trend' as const, percent: (last.metrics.trendCents / first.metrics.trendCents - 1) * 100, from: day, to: last.day };
  };
  return {
    product,
    products,
    ...summary,
    transactions,
    prices: productPrices.slice(-366),
    valuation,
    observed: {
      metric: 'trend',
      high: trendValues.length ? Math.max(...trendValues) : null,
      low: trendValues.length ? Math.min(...trendValues) : null,
      drawdown: trendValues.length && prices.at(-1)?.metrics.trendCents !== null && prices.at(-1)?.metrics.trendCents !== undefined
        ? ((prices.at(-1)!.metrics.trendCents! - Math.max(...trendValues)) / Math.max(...trendValues)) * 100
        : null,
      firstPurchase: changeSince(summary.positions[0]?.firstBuy),
      lastPurchase: changeSince(summary.positions[0]?.lastBuy),
    },
  };
}

export async function getSealedSourceStatus(sql: NeonSql): Promise<SealedSourceStatus & { sync: ReturnType<typeof mapSyncRun>[]; lastSync: LastSyncDetails | null }> {
  const [productResult, priceResult, latestProductResult, latestPriceResult, syncResult, settingResult] = await Promise.all([
    sql`select count(*)::int as count from public.tcg_sealed_products where active = true`,
    sql`select count(*)::int as count from public.tcg_sealed_price_snapshots`,
    sql`select max(source_at)::text as source_at from public.tcg_sealed_products where active = true`,
    sql`select max(source_at)::text as source_at, max(fetched_at)::text as fetched_at from public.tcg_sealed_price_snapshots`,
    sql`
      select id::text, started_at::text, finished_at::text, status, details
      from public.tcg_sealed_sync_runs order by started_at desc limit 10
    `,
    sql`select key, value from public.tcg_sealed_settings where key = 'last_sync' limit 1`,
  ]);
  const productRows = productResult as unknown as Array<{ count: number | string }>;
  const priceRows = priceResult as unknown as Array<{ count: number | string }>;
  const latestProductRows = latestProductResult as unknown as Array<{ source_at: string | null }>;
  const latestPriceRows = latestPriceResult as unknown as Array<{ source_at: string | null; fetched_at: string | null }>;
  const syncRows = syncResult as unknown as SyncRunRow[];
  const settingRows = settingResult as unknown as SettingRow[];
  const lastSync = settingRows[0] ? jsonObject(settingRows[0].value) as LastSyncDetails : null;
  const latestRun = syncRows[0];
  return {
    catalogueSourceAt: latestProductRows[0]?.source_at ?? lastSync?.catalogue_source_at ?? null,
    priceSourceAt: latestPriceRows[0]?.source_at ?? lastSync?.price_source_at ?? null,
    fetchedAt: latestPriceRows[0]?.fetched_at ?? lastSync?.fetched_at ?? null,
    catalogueCount: Number(lastSync?.catalogue_count ?? productRows[0]?.count ?? 0),
    priceCount: Number(lastSync?.guide_count ?? priceRows[0]?.count ?? 0),
    matchedCount: Number(lastSync?.matched ?? 0),
    lastRunStatus: latestRun?.status ?? null,
    lastRunError: typeof latestRun?.details === 'object' && latestRun.details !== null && 'error' in latestRun.details
      ? String((latestRun.details as { error?: unknown }).error ?? '') || null
      : null,
    sync: syncRows.map(mapSyncRun),
    lastSync,
  };
}

export async function mutateSealedTransaction(
  sql: NeonSql,
  userId: string,
  input: unknown,
  options: {
    mode: 'create' | 'update' | 'void';
    id?: string;
    transactionRevision?: number;
    expectedRevision?: number;
    idempotency?: { keyHash: string; requestHash: string };
  },
) {
  if (options.idempotency) {
    const cachedRows = await sql`
      select request_hash, response
      from public.api_idempotency
      where user_id = ${userId}::uuid
        and key_hash = ${options.idempotency.keyHash}
        and expires_at > now()
      limit 1
    ` as Array<{ request_hash: string; response: unknown }>;
    const cached = cachedRows[0];
    if (cached) {
      if (cached.request_hash.trim() !== options.idempotency.requestHash) {
        throw new SealedConflictError('This idempotency key was already used for a different request.');
      }
      const response = jsonObject(cached.response);
      return { ...response, replayed: true };
    }
  }

  // Capture the revision before reading the ledger. If a concurrent write
  // lands during the read, the guarded mutation below must conflict instead
  // of validating old rows against a newer revision.
  const currentRevision = await getSealedRevision(sql, userId);
  const all = await getSealedTransactions(sql, userId);
  const old = options.id ? all.find((transaction) => transaction.id === options.id) : undefined;
  if (options.mode !== 'create' && !old) throw new SealedNotFoundError('Sealed transaction not found.');
  if (options.mode !== 'create' && old && options.transactionRevision !== old.revision) {
    throw new SealedConflictError('This transaction changed. Reload the journal and try again.');
  }
  if (options.mode === 'void' && old?.voided) {
    throw new SealedConflictError('This transaction is already cancelled.');
  }
  const draft = options.mode === 'void' ? old! : normalizeSealedDraft(input);
  const productIds = [...new Set([
    draft.cardmarketProductId,
    ...(draft.exchangeGive ? [draft.exchangeGive.cardmarketProductId] : []),
  ])];
  const products = await getSealedProducts(sql, userId, productIds);
  if (products.length !== productIds.length) {
    throw new SealedNotFoundError('Cardmarket sealed product not found.');
  }
  const now = new Date().toISOString();
  const next = validateSealedTransaction({
    ...draft,
    id: old?.id ?? randomUUID(),
    revision: old ? old.revision + 1 : 1,
    createdAt: old?.createdAt ?? now,
    updatedAt: now,
    voided: options.mode === 'void' || Boolean(old?.voided),
  });
  let ledger;
  try {
    ledger = replaySealedLedger([...all.filter((transaction) => transaction.id !== next.id), next]);
  } catch (error) {
    throw new SealedServerError(error instanceof Error ? error.message : 'The transaction makes the portfolio inconsistent.', 400);
  }
  const expectedRevision = options.expectedRevision ?? currentRevision;
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new SealedServerError('Invalid portfolio revision.', 400);
  }
  const newRevision = expectedRevision + 1;
  const mutationId = randomUUID();
  const allocations = [
    ...ledger.sales.flatMap((sale) => sale.allocations.map((allocation) => ({
      saleId: sale.transaction.id,
      lotId: allocation.lotId,
      quantity: allocation.quantity,
      costCents: allocation.costCents,
      holdingDays: allocation.holdingDays,
    }))),
    ...ledger.exchanges.flatMap((exchange) => exchange.allocations.map((allocation) => ({
      saleId: exchange.transaction.id,
      lotId: allocation.lotId,
      quantity: allocation.quantity,
      costCents: allocation.costCents,
      holdingDays: allocation.holdingDays,
    }))),
  ];
  const serializedSelections = JSON.stringify(next.selections);
  const exchangeGiveProductId = next.exchangeGive?.cardmarketProductId ?? null;
  const exchangeGiveLanguage = next.exchangeGive?.language ?? null;
  const exchangeGiveQuantity = next.exchangeGive?.quantity ?? null;
  const serializedBefore = old ? JSON.stringify(old) : null;
  const serializedAfter = JSON.stringify(next);
  const idempotentResponse = JSON.stringify({ transaction: next, revision: newRevision, allocations });
  let transactionResults: unknown[][];
  try {
    transactionResults = await sql.transaction((tx) => {
      const statements = [
        tx`
          insert into public.tcg_sealed_user_revisions (user_id, revision)
          values (${userId}::uuid, 0)
          on conflict (user_id) do nothing
        `,
      ];
      if (options.idempotency) {
        statements.push(tx`
          insert into public.api_idempotency (user_id, key_hash, request_hash, response, expires_at)
          values (
            ${userId}::uuid,
            ${options.idempotency.keyHash},
            ${options.idempotency.requestHash},
            ${idempotentResponse}::jsonb,
            now() + interval '24 hours'
          )
          on conflict (user_id, key_hash) do update set
            request_hash = excluded.request_hash,
            response = excluded.response,
            created_at = now(),
            expires_at = excluded.expires_at
          where public.api_idempotency.expires_at <= now()
          returning key_hash
        `);
      }
      statements.push(options.idempotency ? tx`
        update public.tcg_sealed_user_revisions
        set revision = revision + 1, last_mutation_id = ${mutationId}::uuid
        where user_id = ${userId}::uuid
          and revision = ${expectedRevision}
          and last_mutation_id is distinct from ${mutationId}::uuid
          and exists (
            select 1 from public.api_idempotency
            where user_id = ${userId}::uuid
              and key_hash = ${options.idempotency.keyHash}
              and response #>> '{transaction,id}' = ${next.id}
          )
        returning revision
      ` : tx`
        update public.tcg_sealed_user_revisions
        set revision = revision + 1, last_mutation_id = ${mutationId}::uuid
        where user_id = ${userId}::uuid
          and revision = ${expectedRevision}
          and last_mutation_id is distinct from ${mutationId}::uuid
        returning revision
      `);
      statements.push(
      tx`
        insert into public.tcg_sealed_transactions (
          id, user_id, cardmarket_product_id, exchange_give_product_id, exchange_give_language,
          exchange_give_quantity, date, revision, kind, language,
          quantity, unit_price_cents, fees_cents, shipping_cents, discount_cents,
          payment_fees_cents, other_costs_cents, platform, counterparty, notes,
          storage, allocation_method, selections, voided, created_at, updated_at
        )
        select
          ${next.id}::uuid, ${userId}::uuid, ${next.cardmarketProductId},
          ${exchangeGiveProductId}, ${exchangeGiveLanguage}, ${exchangeGiveQuantity},
          ${next.date}::date, ${next.revision}, ${next.kind}, ${next.language}, ${next.quantity},
          ${next.unitPriceCents}, ${next.feesCents}, ${next.shippingCents}, ${next.discountCents},
          ${next.paymentFeesCents}, ${next.otherCostsCents}, ${next.platform}, ${next.counterparty},
          ${next.notes}, ${next.storage}, ${next.allocationMethod}, ${serializedSelections}::jsonb,
          ${next.voided}, ${next.createdAt}::timestamptz, ${next.updatedAt}::timestamptz
        where exists (
          select 1 from public.tcg_sealed_user_revisions
          where user_id = ${userId}::uuid and revision = ${newRevision} and last_mutation_id = ${mutationId}::uuid
        )
        on conflict (id) do update set
          cardmarket_product_id = excluded.cardmarket_product_id,
          exchange_give_product_id = excluded.exchange_give_product_id,
          exchange_give_language = excluded.exchange_give_language,
          exchange_give_quantity = excluded.exchange_give_quantity,
          date = excluded.date,
          revision = excluded.revision,
          kind = excluded.kind,
          language = excluded.language,
          quantity = excluded.quantity,
          unit_price_cents = excluded.unit_price_cents,
          fees_cents = excluded.fees_cents,
          shipping_cents = excluded.shipping_cents,
          discount_cents = excluded.discount_cents,
          payment_fees_cents = excluded.payment_fees_cents,
          other_costs_cents = excluded.other_costs_cents,
          platform = excluded.platform,
          counterparty = excluded.counterparty,
          notes = excluded.notes,
          storage = excluded.storage,
          allocation_method = excluded.allocation_method,
          selections = excluded.selections,
          voided = excluded.voided,
          updated_at = excluded.updated_at
        where public.tcg_sealed_transactions.user_id = ${userId}::uuid
      `,
      tx`
        delete from public.tcg_sealed_allocations
        where user_id = ${userId}::uuid
          and exists (
            select 1 from public.tcg_sealed_user_revisions
            where user_id = ${userId}::uuid and revision = ${newRevision} and last_mutation_id = ${mutationId}::uuid
          )
      `,
      ...allocations.map((allocation) => tx`
        insert into public.tcg_sealed_allocations
          (user_id, sale_id, lot_id, quantity, cost_cents, holding_days)
        select
          ${userId}::uuid, ${allocation.saleId}::uuid, ${allocation.lotId}::uuid,
          ${allocation.quantity}, ${allocation.costCents}, ${allocation.holdingDays}
        where exists (
          select 1 from public.tcg_sealed_user_revisions
          where user_id = ${userId}::uuid and revision = ${newRevision} and last_mutation_id = ${mutationId}::uuid
        )
      `),
      tx`
        insert into public.tcg_sealed_audit
          (user_id, transaction_id, action, before_data, after_data)
        select
          ${userId}::uuid, ${next.id}::uuid, ${options.mode},
          ${serializedBefore}::jsonb, ${serializedAfter}::jsonb
        where exists (
          select 1 from public.tcg_sealed_user_revisions
          where user_id = ${userId}::uuid and revision = ${newRevision} and last_mutation_id = ${mutationId}::uuid
        )
      `,
      tx`
        delete from public.tcg_sealed_portfolio_daily
        where user_id = ${userId}::uuid
          and exists (
            select 1 from public.tcg_sealed_user_revisions
            where user_id = ${userId}::uuid and revision = ${newRevision} and last_mutation_id = ${mutationId}::uuid
        )
      `,
      );
      if (options.idempotency) {
        statements.push(tx`
          delete from public.api_idempotency
          where user_id = ${userId}::uuid
            and key_hash = ${options.idempotency.keyHash}
            and response #>> '{transaction,id}' = ${next.id}
            and not exists (
              select 1 from public.tcg_sealed_user_revisions
              where user_id = ${userId}::uuid and revision = ${newRevision} and last_mutation_id = ${mutationId}::uuid
            )
        `);
      }
      return statements;
    }, { isolationLevel: 'Serializable' }) as unknown as unknown[][];
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code !== '40001' && code !== '40P01') throw error;
    if (options.idempotency) {
      const cachedRows = await sql`
        select request_hash, response
        from public.api_idempotency
        where user_id = ${userId}::uuid
          and key_hash = ${options.idempotency.keyHash}
          and expires_at > now()
        limit 1
      ` as Array<{ request_hash: string; response: unknown }>;
      const cached = cachedRows[0];
      if (cached) {
        if (cached.request_hash.trim() !== options.idempotency.requestHash) {
          throw new SealedConflictError('This idempotency key was already used for a different request.');
        }
        return { ...jsonObject(cached.response), replayed: true };
      }
    }
    throw new SealedConflictError();
  }
  const revisionIndex = options.idempotency ? 2 : 1;
  const guardRows = transactionResults[revisionIndex] as RevisionRow[];
  if (!guardRows[0]) {
    if (options.idempotency) {
      const cachedRows = await sql`
        select request_hash, response
        from public.api_idempotency
        where user_id = ${userId}::uuid
          and key_hash = ${options.idempotency.keyHash}
          and expires_at > now()
        limit 1
      ` as Array<{ request_hash: string; response: unknown }>;
      const cached = cachedRows[0];
      if (cached) {
        if (cached.request_hash.trim() !== options.idempotency.requestHash) {
          throw new SealedConflictError('This idempotency key was already used for a different request.');
        }
        return { ...jsonObject(cached.response), replayed: true };
      }
    }
    throw new SealedConflictError();
  }
  return { transaction: next, revision: newRevision, allocations, replayed: false };
}

export async function setSealedAlias(sql: NeonSql, userId: string, productId: number, alias: string | null) {
  const product = (await getSealedProducts(sql, userId, [productId], false))[0];
  if (!product) throw new SealedNotFoundError('Sealed product not found.');
  const normalized = alias?.trim() ?? '';
  if (normalized.length > 512) throw new SealedServerError('Alias is too long.', 400);
  if (!normalized) {
    await sql`
      delete from public.tcg_sealed_aliases
      where user_id = ${userId}::uuid and cardmarket_product_id = ${productId}
    `;
    return { productId, alias: null };
  }
  await sql`
    insert into public.tcg_sealed_aliases (user_id, cardmarket_product_id, alias)
    values (${userId}::uuid, ${productId}, ${normalized})
    on conflict (user_id, cardmarket_product_id) do update set alias = excluded.alias
  `;
  return { productId, alias: normalized };
}

export async function exportSealedPortfolio(sql: NeonSql, userId: string) {
  const data = await loadSealedPortfolio(sql, userId);
  const [allocationResult, aliasResult, auditResult, revision] = await Promise.all([
    sql`
      select sale_id::text as sale_id, lot_id::text as lot_id, quantity, cost_cents, holding_days
      from public.tcg_sealed_allocations where user_id = ${userId}::uuid order by sale_id, lot_id
    `,
    sql`
      select cardmarket_product_id, alias, updated_at::text as updated_at
      from public.tcg_sealed_aliases where user_id = ${userId}::uuid order by cardmarket_product_id
    `,
    sql`
      select id, transaction_id::text as transaction_id, action, at::text as at, before_data, after_data
      from public.tcg_sealed_audit where user_id = ${userId}::uuid order by id
    `,
    getSealedRevision(sql, userId),
  ]);
  const allocations = allocationResult as unknown as Array<Record<string, unknown>>;
  const aliases = aliasResult as unknown as Array<Record<string, unknown>>;
  const audit = auditResult as unknown as Array<Record<string, unknown>>;
  return {
    format: 'lunidex-sealed-portfolio',
    version: 1,
    currency: 'EUR',
    exportedAt: new Date().toISOString(),
    revision,
    transactions: data.transactions,
    products: data.products,
    prices: data.prices,
    inventory: summarizeSealedPortfolio(data.transactions, data.products, data.prices, new Date().toISOString().slice(0, 10)).positions,
    allocations,
    aliases,
    audit,
  };
}

function jsonProduct(product: SealedProduct) {
  return {
    cardmarketProductId: product.cardmarketProductId,
    name: product.name,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    expansionId: product.expansionId,
    cardmarketUrl: product.cardmarketUrl,
    imageAvailable: product.imageAvailable,
    sourceAt: product.sourceAt,
    updatedAt: product.updatedAt,
    active: product.active,
  };
}

export function sealedExportCsv(exported: Awaited<ReturnType<typeof exportSealedPortfolio>>): string {
  const header = ['id', 'kind', 'product_id', 'date', 'language', 'quantity', 'unit_price_eur', 'fees_eur', 'shipping_eur', 'discount_eur', 'payment_fees_eur', 'other_costs_eur', 'allocation_method', 'voided', 'notes', 'exchange_give_product_id', 'exchange_give_language', 'exchange_give_quantity'];
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = exported.transactions.map((transaction) => [
    transaction.id,
    transaction.kind,
    transaction.cardmarketProductId,
    transaction.date,
    transaction.language,
    transaction.quantity,
    (transaction.unitPriceCents / 100).toFixed(2),
    (transaction.feesCents / 100).toFixed(2),
    (transaction.shippingCents / 100).toFixed(2),
    (transaction.discountCents / 100).toFixed(2),
    (transaction.paymentFeesCents / 100).toFixed(2),
    (transaction.otherCostsCents / 100).toFixed(2),
    transaction.allocationMethod,
    transaction.voided,
    transaction.notes,
    transaction.exchangeGive?.cardmarketProductId ?? '',
    transaction.exchangeGive?.language ?? '',
    transaction.exchangeGive?.quantity ?? '',
  ].map(quote).join(','));
  return [header.map(quote).join(','), ...rows].join('\n');
}

function sourceDetails(data: DownloadedCardmarketData, fetchedAt: string, priceRevision: number): LastSyncDetails {
  return {
    sources: SEALED_CARDMARKET_SOURCES,
    catalogue_count: data.catalogueCount,
    guide_count: data.priceGuideCount,
    matched: data.matchedCount,
    catalogue_source_at: data.catalogueSourceAt,
    price_source_at: data.priceSourceAt,
    catalogue_sha256: data.catalogueSha256,
    price_sha256: data.priceSha256,
    fetched_at: fetchedAt,
    price_revision: priceRevision,
  };
}

function previousSyncValue(value: unknown): LastSyncDetails | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LastSyncDetails : null;
}

function jsonProductBatch(products: readonly SealedProduct[]): string {
  return JSON.stringify(products.map(jsonProduct));
}

function priceBatch(prices: readonly SealedPriceSnapshot[]): string {
  return JSON.stringify(prices.map((price) => ({
    cardmarketProductId: price.cardmarketProductId,
    day: price.day,
    sourceAt: price.sourceAt,
    fetchedAt: price.fetchedAt,
    ...price.metrics,
  })));
}

async function markSyncFailed(sql: NeonSql, id: string, error: unknown): Promise<void> {
  try {
    await sql`
      update public.tcg_sealed_sync_runs
      set status = 'failed', finished_at = now(), details = ${JSON.stringify({
        error: error instanceof Error ? error.message : 'Cardmarket synchronization failed.',
        sources: SEALED_CARDMARKET_SOURCES,
      })}::jsonb
      where id = ${id}::uuid
    `;
  } catch {
    // Preserve the original import error.
  }
}

export async function synchronizeSealedCardmarket(sql: NeonSql, now = new Date()) {
  const runId = randomUUID();
  const lockedUntil = new Date(now.getTime() + 15 * 60_000).toISOString();
  const lockRows = await sql`
    insert into public.tcg_sealed_settings (key, value)
    values ('sync_lock', ${JSON.stringify({ runId, lockedUntil })}::jsonb)
    on conflict (key) do update set value = excluded.value
    where (public.tcg_sealed_settings.value->>'lockedUntil') is null
      or (public.tcg_sealed_settings.value->>'lockedUntil')::timestamptz <= now()
    returning key
  ` as Array<{ key: string }>;
  if (!lockRows[0]) throw new SealedServerError('A sealed catalogue synchronization is already running.', 409);
  try {
    await sql`
      insert into public.tcg_sealed_sync_runs (id, status, details)
      values (${runId}::uuid, 'running', ${JSON.stringify({ sources: SEALED_CARDMARKET_SOURCES })}::jsonb)
    `;
    const data = await downloadAndParseSealedCardmarketData(now);
    const settingRows = await sql`
      select key, value
      from public.tcg_sealed_settings
      where key in ('last_sync', 'price_revision')
    ` as SettingRow[];
    const lastSync = previousSyncValue(settingRows.find((row) => row.key === 'last_sync')?.value);
    if (lastSync?.catalogue_source_at && Date.parse(data.catalogueSourceAt) < Date.parse(lastSync.catalogue_source_at)) {
      throw new SealedServerError('The Cardmarket catalogue publication is older than the saved one.', 422);
    }
    if (lastSync?.price_source_at && Date.parse(data.priceSourceAt) < Date.parse(lastSync.price_source_at)) {
      throw new SealedServerError('The Cardmarket price publication is older than the saved one.', 422);
    }
    if (lastSync?.catalogue_source_at === data.catalogueSourceAt && lastSync.catalogue_sha256 && lastSync.catalogue_sha256 !== data.catalogueSha256) {
      throw new SealedServerError('The Cardmarket catalogue publication checksum changed.', 422);
    }
    if (lastSync?.price_source_at === data.priceSourceAt && lastSync.price_sha256 && lastSync.price_sha256 !== data.priceSha256) {
      throw new SealedServerError('The Cardmarket price publication checksum changed.', 422);
    }
    const previousRevisionValue = settingRows.find((row) => row.key === 'price_revision')?.value;
    const previousRevision = typeof previousRevisionValue === 'number'
      ? previousRevisionValue
      : Number(previousRevisionValue ?? 0);
    const publicationChanged = !lastSync
      || lastSync.catalogue_source_at !== data.catalogueSourceAt
      || lastSync.price_source_at !== data.priceSourceAt
      || lastSync.catalogue_sha256 !== data.catalogueSha256
      || lastSync.price_sha256 !== data.priceSha256;
    const priceRevision = Number.isSafeInteger(previousRevision) && previousRevision >= 0
      ? publicationChanged ? previousRevision + 1 : previousRevision
      : 1;
    const fetchedAt = now.toISOString();
    const details = sourceDetails(data, fetchedAt, priceRevision);

    // Cardmarket publications are immutable. Once the source timestamps and
    // checksums match the last successful run, downloading and re-upserting
    // the complete catalogue only burns database CPU/WAL without changing
    // any user-visible data. Keep the successful run marker fresh, but skip
    // the bulk writes.
    if (!publicationChanged) {
      await sql.transaction((tx) => [
        tx`
          insert into public.tcg_sealed_settings (key, value)
          values ('last_sync', ${JSON.stringify(details)}::jsonb)
          on conflict (key) do update set value = excluded.value
        `,
        tx`
          update public.tcg_sealed_sync_runs
          set status = 'success', finished_at = ${fetchedAt}::timestamptz, details = ${JSON.stringify(details)}::jsonb
          where id = ${runId}::uuid
        `,
      ]);
      return { ...details, runId };
    }

    const productChunks: string[] = [];
    for (let index = 0; index < data.products.length; index += 500) productChunks.push(jsonProductBatch(data.products.slice(index, index + 500)));
    const priceChunks: string[] = [];
    for (let index = 0; index < data.prices.length; index += 500) priceChunks.push(priceBatch(data.prices.slice(index, index + 500)));
    await sql.transaction((tx) => [
      ...productChunks.map((batch) => tx`
        insert into public.tcg_sealed_products (
          cardmarket_product_id, name, category_id, category_name, expansion_id,
          cardmarket_url, image_available, source_at, updated_at, active
        )
        select
          (row->>'cardmarketProductId')::int,
          row->>'name',
          (row->>'categoryId')::int,
          row->>'categoryName',
          (row->>'expansionId')::int,
          row->>'cardmarketUrl',
          coalesce((row->>'imageAvailable')::boolean, true),
          (row->>'sourceAt')::timestamptz,
          (row->>'updatedAt')::timestamptz,
          coalesce((row->>'active')::boolean, true)
        from jsonb_array_elements(${batch}::jsonb) row
        on conflict (cardmarket_product_id) do update set
          name = excluded.name,
          category_id = excluded.category_id,
          category_name = excluded.category_name,
          expansion_id = excluded.expansion_id,
          cardmarket_url = excluded.cardmarket_url,
          source_at = excluded.source_at,
          updated_at = excluded.updated_at,
          active = excluded.active
      `),
      ...priceChunks.map((batch) => tx`
        insert into public.tcg_sealed_price_snapshots (
          cardmarket_product_id, day, source_at, fetched_at,
          avg_cents, low_cents, trend_cents, avg1_cents, avg7_cents, avg30_cents
        )
        select
          (row->>'cardmarketProductId')::int,
          (row->>'day')::date,
          (row->>'sourceAt')::timestamptz,
          (row->>'fetchedAt')::timestamptz,
          (row->>'avgCents')::bigint,
          (row->>'lowCents')::bigint,
          (row->>'trendCents')::bigint,
          (row->>'avg1Cents')::bigint,
          (row->>'avg7Cents')::bigint,
          (row->>'avg30Cents')::bigint
        from jsonb_array_elements(${batch}::jsonb) row
        -- A source publication is immutable: retrying it on the same day or
        -- a later day must not manufacture another observation.
        on conflict do nothing
      `),
      tx`
        insert into public.tcg_sealed_settings (key, value)
        values ('price_revision', ${JSON.stringify(priceRevision)}::jsonb)
        on conflict (key) do update set value = excluded.value
      `,
      tx`
        insert into public.tcg_sealed_settings (key, value)
        values ('last_sync', ${JSON.stringify(details)}::jsonb)
        on conflict (key) do update set value = excluded.value
      `,
      tx`
        update public.tcg_sealed_sync_runs
        set status = 'success', finished_at = ${fetchedAt}::timestamptz, details = ${JSON.stringify(details)}::jsonb
        where id = ${runId}::uuid
      `,
    ]);
    return { ...details, runId };
  } catch (error) {
    await markSyncFailed(sql, runId, error);
    throw error;
  } finally {
    try {
      await sql`
        delete from public.tcg_sealed_settings
        where key = 'sync_lock' and value->>'runId' = ${runId}
      `;
    } catch {
      // The lock has an expiry so a cleanup failure cannot block imports
      // indefinitely; preserve the original sync result or error.
    }
  }
}

export async function getSealedImageUrl(sql: NeonSql, id: number): Promise<string[]> {
  const rows = await sql`
    select category_id, image_available
    from public.tcg_sealed_products
    where cardmarket_product_id = ${id} and active = true
    limit 1
  ` as Array<{ category_id: number | string; image_available: boolean }>;
  const row = rows[0];
  if (!row || !row.image_available) throw new SealedNotFoundError('Sealed product image not found.');
  return getSealedImageCandidates(requiredNumber(row.category_id), id);
}

export function isSealedLanguage(value: unknown): value is SealedProductLanguage {
  return value === 'unknown' || value === 'en' || value === 'fr' || value === 'es' || value === 'de' || value === 'it' || value === 'ja';
}
