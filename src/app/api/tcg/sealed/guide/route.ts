import { NextRequest, NextResponse } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { getNeonClient } from '@/lib/neon/server';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import { getPublicSealedGuide } from '@/lib/tcg-sealed-guide-server';

const CACHE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';
const NO_CACHE = { 'Cache-Control': 'private, no-store' };

async function getGuide(request: NextRequest): Promise<NextResponse> {
  if (!rateLimit(`tcg-sealed-guide:${ipKey(request)}`, 30)) {
    return NextResponse.json({ error: 'Too many sealed guide requests.' }, { status: 429, headers: NO_CACHE });
  }
  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Sealed guide unavailable.' }, { status: 503, headers: NO_CACHE });
  try {
    const result = await getPublicSealedGuide(sql, new Date().toISOString().slice(0, 10));
    return NextResponse.json(result, { headers: { 'Cache-Control': result.index.status === 'available' ? CACHE : 'public, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Sealed guide unavailable.' }, { status: 503, headers: NO_CACHE });
  }
}

export const GET = withObservedRouteHandler('/api/tcg/sealed/guide', 'tcg-sealed', getGuide);
