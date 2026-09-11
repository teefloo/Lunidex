import { NextRequest, NextResponse } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { getNeonClient } from '@/lib/neon/server';
import { synchronizeSealedCardmarket } from '@/lib/tcg-sealed-server';

export const runtime = 'nodejs';
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

async function runSync(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Sealed sync unavailable.' }, { status: 503, headers: NO_STORE_HEADERS });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: NO_STORE_HEADERS });
  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Application database unavailable.' }, { status: 503, headers: NO_STORE_HEADERS });
  try {
    return NextResponse.json({ ok: true, sync: await synchronizeSealedCardmarket(sql) }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Sealed Cardmarket sync failed.' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export const GET = withObservedRouteHandler('/api/cron/tcg-sealed-sync', 'tcg-sealed', runSync);
