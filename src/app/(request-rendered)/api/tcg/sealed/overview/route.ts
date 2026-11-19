import { NextRequest, NextResponse } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { rateLimit } from '@/lib/rate-limit';
import { getSealedOverview } from '@/lib/tcg-sealed-server';
import { dateParam, getSealedRequestContext, isSealedRequestContext, sealedErrorResponse } from '@/lib/tcg-sealed-route';

async function getOverview(request: NextRequest): Promise<NextResponse> {
  const context = await getSealedRequestContext(request);
  if (!isSealedRequestContext(context)) return context;
  if (!rateLimit(`tcg-sealed-overview:${context.userId}`, 120)) return NextResponse.json({ error: 'Too many sealed portfolio requests.' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  const today = new Date().toISOString().slice(0, 10);
  const from = dateParam(request.nextUrl.searchParams.get('from'), '0000-01-01');
  const to = dateParam(request.nextUrl.searchParams.get('to'), today);
  const requestedGroup = request.nextUrl.searchParams.get('group');
  const group = requestedGroup === 'day' || requestedGroup === 'year' ? requestedGroup : 'month';
  try {
    return NextResponse.json(
      await getSealedOverview(context.sql, context.userId, { from, to, group }),
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return sealedErrorResponse(error);
  }
}

export const GET = withObservedRouteHandler('/api/tcg/sealed/overview', 'tcg-sealed', getOverview);
