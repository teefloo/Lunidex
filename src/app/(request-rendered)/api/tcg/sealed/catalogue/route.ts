import { NextRequest, NextResponse } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { rateLimit } from '@/lib/rate-limit';
import { searchSealedCatalogue } from '@/lib/tcg-sealed-server';
import { getSealedRequestContext, isSealedRequestContext, sealedErrorResponse } from '@/lib/tcg-sealed-route';

async function getCatalogue(request: NextRequest): Promise<NextResponse> {
  const context = await getSealedRequestContext(request);
  if (!isSealedRequestContext(context)) return context;
  if (!rateLimit(`tcg-sealed-catalogue:${context.userId}`, 120)) return NextResponse.json({ error: 'Too many sealed portfolio requests.' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  const query = request.nextUrl.searchParams.get('q') ?? '';
  const pageValue = Number(request.nextUrl.searchParams.get('page') ?? 0);
  const page = Number.isSafeInteger(pageValue) && pageValue >= 0 ? pageValue : 0;
  try {
    return NextResponse.json(
      await searchSealedCatalogue(context.sql, context.userId, query, page),
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return sealedErrorResponse(error);
  }
}

export const GET = withObservedRouteHandler('/api/tcg/sealed/catalogue', 'tcg-sealed', getCatalogue);
