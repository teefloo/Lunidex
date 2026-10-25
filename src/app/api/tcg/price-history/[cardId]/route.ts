import { NextRequest, NextResponse } from 'next/server';
import { getNeonClient } from '@/lib/neon/server';
import { isValidTcgCardId } from '@/lib/tcg-owned-cards';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { ipKey, rateLimit } from '@/lib/rate-limit';

const PRICE_HISTORY_MAX_REQUESTS_PER_MINUTE = 60;
const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400',
  'Vercel-CDN-Cache-Control': 'max-age=21600',
};

interface RouteParams {
  params: Promise<{ cardId: string }>;
}

export const runtime = 'nodejs';

async function getPriceHistory(request: NextRequest, { params }: RouteParams) {
  if (!rateLimit(`tcg-price-history:${ipKey(request)}`, PRICE_HISTORY_MAX_REQUESTS_PER_MINUTE)) {
    return NextResponse.json(
      { error: 'Too many price history requests' },
      { status: 429, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const { cardId } = await params;

  if (!isValidTcgCardId(cardId)) {
    return NextResponse.json({ error: 'Missing cardId' }, { status: 400 });
  }

  const daysParam = request.nextUrl.searchParams.get('days');
  const days = daysParam === '7' ? 7 : daysParam === '90' ? 90 : 30;

  const sql = getNeonClient();
  if (!sql) {
    return NextResponse.json({ history: [], status: 'unavailable' }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Legacy rows store neither the language nor the finish, printing, or price
  // metric that produced each point. Their top-level Cardmarket values may
  // describe a different finish from the current card reference. Reading them
  // cannot safely repair their identity, and GET must never create snapshots.
  const rows = await sql`
    select recorded_at
    from public.tcg_price_history
    where card_id = ${cardId}
      and recorded_at >= ${since}::timestamptz
    limit 1
  ` as Array<{ recorded_at: string }>;

  // A future writer must persist language, finish/printing, source, currency,
  // metric and source timestamp together before a comparable series is served.
  return NextResponse.json(
    { history: [], status: rows.length > 0 ? 'unqualified-history' : 'empty' },
    { headers: PUBLIC_CACHE_HEADERS },
  );
}

export const GET = withObservedRouteHandler('/api/tcg/price-history/:id', 'tcg', getPriceHistory);
