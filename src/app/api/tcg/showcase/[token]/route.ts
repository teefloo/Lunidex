import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getTCGCardLocalizedCached } from '@/lib/api/server-cache';
import { getCardMarketValue } from '@/lib/tcg-collection';
import { getNeonClient } from '@/lib/neon/server';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import { getShareableTCGCollection, normalizeTCGSharePage, sliceTCGShareCards } from '@/lib/tcg-collection-share';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

interface PublicShareRow {
  collection_id: string;
  show_quantities: boolean;
  show_prices: boolean;
  data: unknown;
}

interface RouteParams {
  params: Promise<{ token: string }>;
}

function noStoreJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

async function getShowcase(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  if (!rateLimit(`tcg-showcase-read:${ipKey(request)}`, 60)) {
    return noStoreJson({ error: 'Too many showcase requests' }, 429);
  }
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) return noStoreJson({ error: 'Showcase unavailable' }, 404);
  const sql = getNeonClient();
  if (!sql) return noStoreJson({ error: 'Showcase service unavailable' }, 503);

  try {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const rows = await sql`
      select share.collection_id::text as collection_id, state.data,
        share.show_quantities, share.show_prices
      from public.tcg_collection_shares as share
      join public.user_state as state on state.user_id = share.user_id
      join app.users as account on account.id = share.user_id
      where share.token_hash = ${tokenHash}
        and account.deletion_state = 'active'
      limit 1
    ` as PublicShareRow[];
    const row = rows[0];
    if (!row) return noStoreJson({ error: 'Showcase unavailable' }, 404);
    const projection = getShareableTCGCollection(row.data, row.collection_id);
    if (!projection) return noStoreJson({ error: 'Showcase unavailable' }, 404);

    const requestedPage = normalizeTCGSharePage(request.nextUrl.searchParams);
    const cards = projection.cards;
    const pageCount = Math.max(1, Math.ceil(cards.length / requestedPage.pageSize));
    const page = { ...requestedPage, page: Math.min(requestedPage.page, pageCount) };
    const pageCards = sliceTCGShareCards(cards, page);
    const items = await Promise.all(pageCards.map(async (reference) => {
      const card = await getTCGCardLocalizedCached(reference.cardId, reference.language).catch(() => null);
      const value = row.show_prices && card ? getCardMarketValue(card) : null;
      return {
        id: reference.cardId,
        language: reference.language,
        name: card?.name ?? reference.cardName,
        localId: card?.localId ?? null,
        setName: card?.set?.name ?? null,
        image: card?.image ?? card?.imageUrl ?? null,
        ...(row.show_quantities ? { quantity: reference.quantity ?? 1 } : {}),
        ...(row.show_prices ? {
          price: value ? {
            amount: value.amount,
            currency: value.currency,
            source: value.provider ?? (value.currency === 'EUR' ? 'cardmarket' : 'tcgplayer'),
            updatedAt: value.updatedAt ?? null,
          } : null,
        } : {}),
      };
    }));

    return noStoreJson({
      collection: {
        name: projection.collection.name,
        description: projection.collection.description ?? '',
      },
      cards: items,
      page: page.page,
      pageSize: page.pageSize,
      pageCount,
      totalCards: cards.length,
      showQuantities: row.show_quantities,
      showPrices: row.show_prices,
    });
  } catch {
    // Do not attach the token-bearing URL to telemetry or server logs.
    return noStoreJson({ error: 'Showcase service unavailable' }, 503);
  }
}

export const GET = getShowcase;
