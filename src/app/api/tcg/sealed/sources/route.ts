import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import { getSealedSourceStatus, synchronizeSealedCardmarket } from '@/lib/tcg-sealed-server';
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

async function postSync(request: NextRequest): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;
  const auth = await getSealedRequestContext(request);
  if (!isSealedRequestContext(auth)) return auth;
  if (!rateLimit(`tcg-sealed-sync:${auth.userId}`, 1) || !rateLimit(`tcg-sealed-sync-ip:${ipKey(request)}`, 2)) return NextResponse.json({ error: 'Sync is rate-limited. Try again later.' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  // Consume the body if a client sent one so malformed chunked requests do
  // not keep a connection open while the source job is started.
  await readJsonBody<Record<string, unknown>>(request);
  try {
    return NextResponse.json({ sync: await synchronizeSealedCardmarket(auth.sql) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return sealedErrorResponse(error); }
}

export const GET = withObservedRouteHandler('/api/tcg/sealed/sources', 'tcg-sealed', getSources);
export const POST = withObservedRouteHandler('/api/tcg/sealed/sources', 'tcg-sealed', postSync);
