import { NextRequest, NextResponse } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { getNeonClient } from '@/lib/neon/server';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import { getPublicSealedProduct } from '@/lib/tcg-sealed-server';
import { sealedErrorResponse, unavailableResponse } from '@/lib/tcg-sealed-route';

const CACHE = { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' };
const NO_STORE = { 'Cache-Control': 'private, no-store' };

async function getMarketProduct(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id: rawId } = await context.params;
  if (!/^[1-9]\d{0,9}$/.test(rawId) || Number(rawId) > 2_147_483_647) {
    return NextResponse.json({ error: 'Invalid product ID.' }, { status: 400, headers: NO_STORE });
  }
  const sql = getNeonClient();
  if (!sql) return unavailableResponse();
  if (!rateLimit(`tcg-sealed-market-product:${ipKey(request)}`, 60)) {
    return NextResponse.json({ error: 'Too many product requests.' }, { status: 429, headers: NO_STORE });
  }
  try {
    return NextResponse.json(await getPublicSealedProduct(sql, Number(rawId)), { headers: CACHE });
  } catch (error) {
    return sealedErrorResponse(error);
  }
}

export const GET = withObservedRouteHandler('/api/tcg/sealed/market-products/[id]', 'tcg-sealed', getMarketProduct);
