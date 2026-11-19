import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { rateLimit } from '@/lib/rate-limit';
import { getSealedProducts, setSealedAlias } from '@/lib/tcg-sealed-server';
import { getSealedRequestContext, isSealedRequestContext, positiveId, sealedErrorResponse } from '@/lib/tcg-sealed-route';

async function getAlias(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await getSealedRequestContext(request);
  if (!isSealedRequestContext(auth)) return auth;
  const id = positiveId((await context.params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid sealed product id.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    const product = (await getSealedProducts(auth.sql, auth.userId, [id], false))[0];
    if (!product) return NextResponse.json({ error: 'Sealed product not found.' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
    return NextResponse.json({ productId: id, alias: product.alias ?? null }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return sealedErrorResponse(error); }
}

async function putAlias(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;
  const auth = await getSealedRequestContext(request);
  if (!isSealedRequestContext(auth)) return auth;
  const id = positiveId((await context.params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid sealed product id.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  if (!rateLimit(`tcg-sealed-alias:${auth.userId}`, 30)) return NextResponse.json({ error: 'Too many sealed portfolio requests.' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  const body = await readJsonBody<{ alias?: unknown }>(request);
  if (!body || (body.alias !== null && body.alias !== undefined && typeof body.alias !== 'string')) return NextResponse.json({ error: 'Invalid alias.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    return NextResponse.json(await setSealedAlias(auth.sql, auth.userId, id, body.alias === undefined ? null : body.alias), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return sealedErrorResponse(error); }
}

async function deleteAlias(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;
  const auth = await getSealedRequestContext(request);
  if (!isSealedRequestContext(auth)) return auth;
  const id = positiveId((await context.params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid sealed product id.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  if (!rateLimit(`tcg-sealed-alias:${auth.userId}`, 30)) return NextResponse.json({ error: 'Too many sealed portfolio requests.' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    return NextResponse.json(await setSealedAlias(auth.sql, auth.userId, id, null), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return sealedErrorResponse(error); }
}

export const GET = withObservedRouteHandler('/api/tcg/sealed/aliases/:id', 'tcg-sealed', getAlias);
export const PUT = withObservedRouteHandler('/api/tcg/sealed/aliases/:id', 'tcg-sealed', putAlias);
export const DELETE = withObservedRouteHandler('/api/tcg/sealed/aliases/:id', 'tcg-sealed', deleteAlias);
