import { NextRequest, NextResponse } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { rateLimit } from '@/lib/rate-limit';
import { getSealedSourceStatus } from '@/lib/tcg-sealed-server';
import { SEALED_CARDMARKET_SOURCES } from '@/lib/tcg-sealed-cardmarket';
import { getSealedRequestContext, isSealedRequestContext, sealedErrorResponse } from '@/lib/tcg-sealed-route';

async function getSources(request: NextRequest): Promise<NextResponse> {
  const auth = await getSealedRequestContext(request);
  if (!isSealedRequestContext(auth)) return auth;
  if (!rateLimit(`tcg-sealed-sources:${auth.userId}`, 60)) return NextResponse.json({ error: 'Too many sealed portfolio requests.' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    return NextResponse.json({ sources: SEALED_CARDMARKET_SOURCES, ...(await getSealedSourceStatus(auth.sql)) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return sealedErrorResponse(error); }
}

export const GET = withObservedRouteHandler('/api/tcg/sealed/sources', 'tcg-sealed', getSources);
