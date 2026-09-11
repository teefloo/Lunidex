import { NextRequest, NextResponse } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { rateLimit } from '@/lib/rate-limit';
import { getSealedProductDetail } from '@/lib/tcg-sealed-server';
import { getSealedRequestContext, isSealedRequestContext, positiveId, sealedErrorResponse } from '@/lib/tcg-sealed-route';

async function getProduct(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await getSealedRequestContext(request);
  if (!isSealedRequestContext(auth)) return auth;
  if (!rateLimit(`tcg-sealed-product:${auth.userId}`, 120)) return NextResponse.json({ error: 'Too many sealed portfolio requests.' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  const id = positiveId((await context.params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid sealed product id.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    return NextResponse.json(await getSealedProductDetail(auth.sql, auth.userId, id), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return sealedErrorResponse(error);
  }
}

export const GET = withObservedRouteHandler('/api/tcg/sealed/products/:id', 'tcg-sealed', getProduct);
