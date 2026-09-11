import { createHash } from 'node:crypto';
import {
  SEALED_PRODUCT_CATEGORY_IDS,
  type SealedPriceMetrics,
  type SealedProduct,
  type SealedPriceSnapshot,
} from '@primedex/core/types/sealed';
import { getSealedCardmarketUrl as getSealedCardmarketUrlFromCatalogue } from '@primedex/core/lib/sealed-catalogue';

export const SEALED_CARDMARKET_SOURCES = {
  catalogue: 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_6.json',
  prices: 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json',
} as const;

const MAX_SOURCE_BYTES = 80_000_000;
const SOURCE_TIMEOUT_MS = 45_000;
const SEALED_CATEGORY_SET = new Set<number>(SEALED_PRODUCT_CATEGORY_IDS);

export interface ParsedCardmarketData {
  products: SealedProduct[];
  prices: SealedPriceSnapshot[];
  catalogueCount: number;
  priceGuideCount: number;
  matchedCount: number;
  catalogueSourceAt: string;
  priceSourceAt: string;
}

export interface DownloadedCardmarketData extends ParsedCardmarketData {
  catalogueBytes: Uint8Array;
  priceBytes: Uint8Array;
  catalogueSha256: string;
  priceSha256: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function sourceDate(value: unknown, label: string, now: Date): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} source date is invalid.`);
  }
  if (Date.parse(value) > now.getTime() + 5 * 60_000) {
    throw new Error(`${label} source publication is in the future.`);
  }
  return value;
}

function metricCents(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000_000) {
    throw new Error('Cardmarket price metric is invalid.');
  }
  return Math.round(value * 100);
}

function parseMetrics(value: Record<string, unknown>): SealedPriceMetrics {
  return {
    avgCents: metricCents(value.avg),
    lowCents: metricCents(value.low),
    trendCents: metricCents(value.trend),
    avg1Cents: metricCents(value.avg1),
    avg7Cents: metricCents(value.avg7),
    avg30Cents: metricCents(value.avg30),
  };
}

function decodeJson(bytes: Uint8Array): unknown {
  if (bytes.byteLength > MAX_SOURCE_BYTES) throw new Error('Cardmarket source file is too large.');
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new Error('Cardmarket source JSON is invalid.');
  }
}

/** Validates and reduces the two official Cardmarket publications. */
export function parseSealedCardmarketFiles(
  cataloguePayload: unknown,
  pricesPayload: unknown,
  now = new Date(),
): ParsedCardmarketData {
  if (!isRecord(cataloguePayload) || cataloguePayload.version !== 1 || !Array.isArray(cataloguePayload.products)) {
    throw new Error('Cardmarket catalogue structure is invalid.');
  }
  if (!isRecord(pricesPayload) || pricesPayload.version !== 1 || !Array.isArray(pricesPayload.priceGuides)) {
    throw new Error('Cardmarket price guide structure is invalid.');
  }
  if (cataloguePayload.products.length < 1 || cataloguePayload.products.length > 200_000) {
    throw new Error('Cardmarket catalogue size is invalid.');
  }
  if (pricesPayload.priceGuides.length < 1 || pricesPayload.priceGuides.length > 500_000) {
    throw new Error('Cardmarket price guide size is invalid.');
  }

  const catalogueSourceAt = sourceDate(cataloguePayload.createdAt, 'Catalogue', now);
  const priceSourceAt = sourceDate(pricesPayload.createdAt, 'Price guide', now);
  const products = new Map<number, SealedProduct>();

  for (const raw of cataloguePayload.products) {
    if (!isRecord(raw)) throw new Error('Cardmarket product entry is invalid.');
    const id = positiveInteger(raw.idProduct);
    const categoryId = positiveInteger(raw.idCategory);
    const expansionId = nonNegativeInteger(raw.idExpansion);
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    const categoryName = typeof raw.categoryName === 'string' ? raw.categoryName.trim() : '';
    if (!id || !categoryId || expansionId === null || !name || !categoryName || name.length > 1_000 || categoryName.length > 200) {
      throw new Error('Cardmarket product entry is invalid.');
    }
    if (products.has(id)) throw new Error('Cardmarket catalogue contains duplicate products.');
    if (!SEALED_CATEGORY_SET.has(categoryId)) continue;
    products.set(id, {
      cardmarketProductId: id,
      name,
      categoryId,
      categoryName,
      expansionId,
      cardmarketUrl: getSealedCardmarketUrlFromCatalogue(id),
      imageAvailable: true,
      sourceAt: catalogueSourceAt,
      updatedAt: now.toISOString(),
      active: true,
    });
  }

  if (products.size === 0) throw new Error('Cardmarket catalogue contains no sealed products.');

  const prices = new Map<number, SealedPriceSnapshot>();
  for (const raw of pricesPayload.priceGuides) {
    if (!isRecord(raw)) throw new Error('Cardmarket price entry is invalid.');
    const id = positiveInteger(raw.idProduct);
    const categoryId = positiveInteger(raw.idCategory);
    if (!id || !categoryId) throw new Error('Cardmarket price entry is invalid.');
    if (prices.has(id)) throw new Error('Cardmarket price guide contains duplicate products.');
    const product = products.get(id);
    if (!product) continue;
    if (product.categoryId !== categoryId) throw new Error('Cardmarket product category mismatch.');
    prices.set(id, {
      cardmarketProductId: id,
      // Cardmarket's publication timestamp identifies the source revision;
      // the daily snapshot itself is keyed by the UTC collection day. This
      // preserves one observable per day and keeps AVG1/AVG7 meaningful when
      // the same official publication is fetched again on a later day.
      day: now.toISOString().slice(0, 10),
      sourceAt: priceSourceAt,
      fetchedAt: now.toISOString(),
      metrics: parseMetrics(raw),
    });
  }

  if (prices.size === 0) throw new Error('Cardmarket price guide contains no matching sealed products.');
  return {
    products: [...products.values()],
    prices: [...prices.values()],
    catalogueCount: products.size,
    priceGuideCount: pricesPayload.priceGuides.length,
    matchedCount: prices.size,
    catalogueSourceAt,
    priceSourceAt,
  };
}

async function downloadBytes(url: string): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error('Official Cardmarket download unavailable.');
  }
  if (!response.ok) throw new Error(`Official Cardmarket download failed: HTTP ${response.status}.`);
  if (!response.headers.get('content-type')?.includes('json')) {
    throw new Error('Official Cardmarket server did not return JSON.');
  }
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SOURCE_BYTES) {
    throw new Error('Official Cardmarket source file is too large.');
  }
  if (!response.body) throw new Error('Official Cardmarket response is empty.');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_SOURCE_BYTES) {
      await reader.cancel();
      throw new Error('Official Cardmarket source file is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export async function downloadAndParseSealedCardmarketData(
  now = new Date(),
): Promise<DownloadedCardmarketData> {
  const [catalogueBytes, priceBytes] = await Promise.all([
    downloadBytes(SEALED_CARDMARKET_SOURCES.catalogue),
    downloadBytes(SEALED_CARDMARKET_SOURCES.prices),
  ]);
  const parsed = parseSealedCardmarketFiles(decodeJson(catalogueBytes), decodeJson(priceBytes), now);
  return {
    ...parsed,
    catalogueBytes,
    priceBytes,
    catalogueSha256: sha256(catalogueBytes),
    priceSha256: sha256(priceBytes),
  };
}
