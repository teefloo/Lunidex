import { NextRequest, NextResponse } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { rateLimit } from '@/lib/rate-limit';
import { exportSealedPortfolio, sealedExportCsv } from '@/lib/tcg-sealed-server';
import { getSealedRequestContext, isSealedRequestContext, sealedErrorResponse } from '@/lib/tcg-sealed-route';

async function getExport(request: NextRequest): Promise<Response> {
  const auth = await getSealedRequestContext(request);
  if (!isSealedRequestContext(auth)) return auth;
  if (!rateLimit(`tcg-sealed-export:${auth.userId}`, 5)) return NextResponse.json({ error: 'Export is rate-limited. Try again later.' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    const exported = await exportSealedPortfolio(auth.sql, auth.userId);
    if (request.nextUrl.searchParams.get('format') === 'csv') {
      return new Response(`\ufeff${sealedExportCsv(exported)}`, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="lunidex-sealed-portfolio.csv"',
          'Cache-Control': 'private, no-store',
        },
      });
    }
    return NextResponse.json(exported, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return sealedErrorResponse(error); }
}

export const GET = withObservedRouteHandler('/api/tcg/sealed/export', 'tcg-sealed', getExport);
