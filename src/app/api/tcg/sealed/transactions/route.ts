import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { rateLimit } from '@/lib/rate-limit';
import { getSealedTransactions, getSealedRevision, mutateSealedTransaction } from '@/lib/tcg-sealed-server';
import { getSealedRequestContext, isSealedRequestContext, sealedErrorResponse } from '@/lib/tcg-sealed-route';

function revisionValue(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : Number.NaN;
}

async function getTransactions(request: NextRequest): Promise<NextResponse> {
  const context = await getSealedRequestContext(request);
  if (!isSealedRequestContext(context)) return context;
  if (!rateLimit(`tcg-sealed-transactions:${context.userId}`, 120)) return NextResponse.json({ error: 'Too many sealed portfolio requests.' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    const includeVoided = request.nextUrl.searchParams.get('includeVoided') === 'true';
    const [transactions, revision] = await Promise.all([
      getSealedTransactions(context.sql, context.userId),
      getSealedRevision(context.sql, context.userId),
    ]);
    return NextResponse.json({ revision, transactions: includeVoided ? transactions : transactions.filter((transaction) => !transaction.voided) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return sealedErrorResponse(error);
  }
}

async function createTransaction(request: NextRequest): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;
  const context = await getSealedRequestContext(request);
  if (!isSealedRequestContext(context)) return context;
  if (!rateLimit(`tcg-sealed-create:${context.userId}`, 30)) return NextResponse.json({ error: 'Too many sealed portfolio requests.' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body) return NextResponse.json({ error: 'Invalid sealed transaction payload.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  const expectedRevision = revisionValue(body.expectedRevision);
  if (Number.isNaN(expectedRevision)) return NextResponse.json({ error: 'Invalid portfolio revision.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    const result = await mutateSealedTransaction(context.sql, context.userId, body, { mode: 'create', expectedRevision });
    return NextResponse.json(result, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return sealedErrorResponse(error);
  }
}

export const GET = withObservedRouteHandler('/api/tcg/sealed/transactions', 'tcg-sealed', getTransactions);
export const POST = withObservedRouteHandler('/api/tcg/sealed/transactions', 'tcg-sealed', createTransaction);
