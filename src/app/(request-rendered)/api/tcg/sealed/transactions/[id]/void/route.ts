import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { rateLimit } from '@/lib/rate-limit';
import { mutateSealedTransaction } from '@/lib/tcg-sealed-server';
import { getSealedRequestContext, isSealedRequestContext, sealedErrorResponse } from '@/lib/tcg-sealed-route';
import { isSealedUuid } from '@/lib/tcg-sealed-server';

async function voidTransaction(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;
  const auth = await getSealedRequestContext(request);
  if (!isSealedRequestContext(auth)) return auth;
  const id = (await context.params).id;
  if (!isSealedUuid(id)) return NextResponse.json({ error: 'Invalid sealed transaction id.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  if (!rateLimit(`tcg-sealed-void:${auth.userId}`, 30)) return NextResponse.json({ error: 'Too many sealed portfolio requests.' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body || typeof body.revision !== 'number' || !Number.isSafeInteger(body.revision) || body.revision < 1) return NextResponse.json({ error: 'Transaction revision is required.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  const expectedRevision = body.expectedRevision === undefined ? undefined : body.expectedRevision;
  if (expectedRevision !== undefined && (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) return NextResponse.json({ error: 'Invalid portfolio revision.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    const result = await mutateSealedTransaction(auth.sql, auth.userId, body, { mode: 'void', id, transactionRevision: body.revision, expectedRevision: expectedRevision as number | undefined });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return sealedErrorResponse(error);
  }
}

export const POST = withObservedRouteHandler('/api/tcg/sealed/transactions/:id/void', 'tcg-sealed', voidTransaction);
