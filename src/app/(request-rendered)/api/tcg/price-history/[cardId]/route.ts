import { NextRequest, NextResponse } from 'next/server';
import { getTCGCardLocalizedCached } from '@/lib/api/server-cache';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { getNeonClient } from '@/lib/neon/server';
import { isValidTcgCardId } from '@/lib/tcg-owned-cards';
import { isTCGCardLanguage } from '@/lib/tcg-language';
import { getQualifiedCardmarketObservations, type TCGPriceVariant } from '@/lib/tcg-qualified-price-history';
import { recordPriceHistoryCardSeen } from '@/lib/tcg-price-history-refresh';
import { upsertQualifiedCardmarketObservations } from '@/lib/tcg-price-history-store';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import { reportSentryException } from '@/lib/sentry-observability';

const GET_MAX_REQUESTS_PER_MINUTE = 60;
const POST_MAX_REQUESTS_PER_MINUTE = 12;
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };
const VARIANTS = new Set<TCGPriceVariant>(['normal', 'holo', 'reverse']);

interface RouteParams {
  params: Promise<{ cardId: string }>;
}

interface HistoryRow {
  id: number | string;
  card_id: string;
  set_id: string;
  card_language: string;
  cardmarket_product_id: number | string;
  variant: TCGPriceVariant;
  source: 'tcgdex-cardmarket';
  metric: 'trend';
  currency: 'EUR';
  value: number | string;
  source_observed_at: string;
  collected_at: string;
}

export const runtime = 'nodejs';

function noStoreJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function requestedLanguage(request: NextRequest): string | null {
  const value = request.nextUrl.searchParams.get('language');
  return isTCGCardLanguage(value) ? value : null;
}

function requestedVariant(request: NextRequest): TCGPriceVariant | null {
  const value = request.nextUrl.searchParams.get('variant');
  return value && VARIANTS.has(value as TCGPriceVariant) ? value as TCGPriceVariant : null;
}

function requestedDays(request: NextRequest): number | null {
  const value = request.nextUrl.searchParams.get('days');
  if (value === null || value === '30') return 30;
  return value === '7' ? 7 : value === '90' ? 90 : null;
}

async function getPriceHistory(request: NextRequest, { params }: RouteParams) {
  if (!rateLimit(`tcg-price-history-read:${ipKey(request)}`, GET_MAX_REQUESTS_PER_MINUTE)) {
    return noStoreJson({ error: 'Too many price history requests' }, 429);
  }
  const { cardId } = await params;
  if (!isValidTcgCardId(cardId)) return noStoreJson({ error: 'Invalid cardId' }, 400);
  const language = requestedLanguage(request);
  const variant = requestedVariant(request);
  const days = requestedDays(request);
  if (!language || !variant || days === null) return noStoreJson({ error: 'Invalid language, variant, or days' }, 400);

  const sql = getNeonClient();
  if (!sql) return noStoreJson({ history: [], status: 'unavailable' });
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  try {
    const rows = await sql`
      with latest_identity as (
        select cardmarket_product_id, set_id
        from public.tcg_price_history_qualified
        where card_id = ${cardId}
          and card_language = ${language}
          and variant = ${variant}
          and source = 'tcgdex-cardmarket'
          and metric = 'trend'
          and currency = 'EUR'
          and market_language_scope = 'aggregate'
          and condition_scope = 'aggregate'
        order by source_observed_at desc, id desc
        limit 1
      )
      select history.id, history.card_id, history.set_id, history.card_language,
        history.cardmarket_product_id, history.variant, history.source, history.metric,
        history.currency, history.value::text as value,
        history.source_observed_at::text, history.collected_at::text
      from public.tcg_price_history_qualified as history
      join latest_identity using (cardmarket_product_id, set_id)
      where history.card_id = ${cardId}
        and history.card_language = ${language}
        and history.variant = ${variant}
        and history.source = 'tcgdex-cardmarket'
        and history.metric = 'trend'
        and history.currency = 'EUR'
        and history.market_language_scope = 'aggregate'
        and history.condition_scope = 'aggregate'
        and history.source_observed_at >= ${since}::timestamptz
      order by history.source_observed_at asc, history.id asc
    ` as HistoryRow[];

    if (rows.length === 0) {
      // Legacy values are never returned; this only explains why older rows
      // exist without making them appear qualified.
      const legacyRows = await sql`
        select 1 as present
        from public.tcg_price_history
        where card_id = ${cardId} and recorded_at >= ${since}::timestamptz
        limit 1
      ` as Array<{ present: number }>;
      return noStoreJson({ history: [], status: legacyRows.length ? 'unqualified-history' : 'empty' });
    }

    // Keep a second guard at the boundary so even an unexpected query/mock
    // result cannot merge observations across a remapped Cardmarket product
    // or TCGdex set identity.
    const latestIdentity = rows.reduce<HistoryRow | null>((latest, row) => (
      latest === null || Date.parse(row.source_observed_at) > Date.parse(latest.source_observed_at) ? row : latest
    ), null);
    const latestSeriesRows = latestIdentity
      ? rows.filter((row) => row.cardmarket_product_id === latestIdentity.cardmarket_product_id && row.set_id === latestIdentity.set_id)
      : [];
    const history = latestSeriesRows.flatMap((row) => {
      const value = Number(row.value);
      return Number.isFinite(value) && value > 0
        ? [{ ...row, id: Number(row.id), cardmarket_product_id: Number(row.cardmarket_product_id), value }]
        : [];
    });
    return noStoreJson({ history, status: history.length < 2 ? 'insufficient-data' : 'ready' });
  } catch (error) {
    reportSentryException(error, {
      feature: 'tcg',
      route: '/api/tcg/price-history/:id',
      method: 'GET',
      operation: 'price-history-read',
    });
    return noStoreJson({ history: [], status: 'unavailable' });
  }
}

async function capturePriceHistory(request: NextRequest, { params }: RouteParams) {
  if (!rateLimit(`tcg-price-history-write:${ipKey(request)}`, POST_MAX_REQUESTS_PER_MINUTE)) {
    return noStoreJson({ error: 'Too many price history captures' }, 429);
  }
  const { cardId } = await params;
  if (!isValidTcgCardId(cardId)) return noStoreJson({ error: 'Invalid cardId' }, 400);

  let language: unknown;
  try {
    const body: unknown = await request.json();
    language = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).language
      : undefined;
  } catch {
    return noStoreJson({ error: 'Invalid JSON body' }, 400);
  }
  if (!isTCGCardLanguage(language)) return noStoreJson({ error: 'Invalid language' }, 400);

  const sql = getNeonClient();
  if (!sql) return noStoreJson({ captured: 0, variants: [], status: 'unavailable' });
  try {
    // This fetcher disables TCGdex's English fallback so language identity in
    // the stored series always matches the printing language requested.
    const card = await getTCGCardLocalizedCached(cardId, language);
    if (!card || card.id !== cardId) return noStoreJson({ captured: 0, variants: [], status: 'empty' });
    // Track only after a successful localized fetch. A card with no current
    // price can still be checked on a later daily pass if its source is updated.
    await recordPriceHistoryCardSeen(sql, cardId, language);
    const observations = getQualifiedCardmarketObservations(card, language);
    if (observations.length === 0) return noStoreJson({ captured: 0, variants: [], status: 'empty' });

    const captured = await upsertQualifiedCardmarketObservations(sql, observations);

    return noStoreJson({
      captured,
      variants: observations.map(({ variant }) => variant),
      status: captured > 0 ? 'captured' : 'already-current',
    });
  } catch (error) {
    reportSentryException(error, {
      feature: 'tcg',
      route: '/api/tcg/price-history/:id',
      method: 'POST',
      operation: 'price-history-capture',
    });
    return noStoreJson({ captured: 0, variants: [], status: 'unavailable' });
  }
}

export const GET = withObservedRouteHandler('/api/tcg/price-history/:id', 'tcg', getPriceHistory);
export const POST = withObservedRouteHandler('/api/tcg/price-history/:id', 'tcg', capturePriceHistory);
