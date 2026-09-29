import { NextRequest, NextResponse } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { getNeonClient } from '@/lib/neon/server';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import { searchPublicSealedCatalogue } from '@/lib/tcg-sealed-server';
import { sealedErrorResponse, unavailableResponse } from '@/lib/tcg-sealed-route';
import { parsePublicMarketFilters } from '@/lib/tcg-sealed-public-market';

const PUBLIC_MARKET_CACHE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';
const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' };

async function getMarketCatalogue(request: NextRequest): Promise<NextResponse> {
  const sql = getNeonClient();
  if (!sql) return unavailableResponse();
  if (!rateLimit(`tcg-sealed-market:${ipKey(request)}`, 60)) {
    return NextResponse.json({ error: 'Too many market catalogue requests.' }, { status: 429, headers: PRIVATE_NO_STORE });
  }

  const filters = parsePublicMarketFilters(request.nextUrl.searchParams);
  try {
    return NextResponse.json(
      await searchPublicSealedCatalogue(sql, filters.q, filters.page, 24, filters),
      { headers: { 'Cache-Control': PUBLIC_MARKET_CACHE } },
    );
  } catch (error) {
    return sealedErrorResponse(error);
  }
}

export const GET = withObservedRouteHandler('/api/tcg/sealed/market-catalogue', 'tcg-sealed', getMarketCatalogue);
