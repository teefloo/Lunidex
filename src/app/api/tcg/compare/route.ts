import { NextRequest, NextResponse } from 'next/server';
import { getTCGCardCached } from '@/lib/api/server-cache';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import { isValidTcgCardId } from '@/lib/tcg-owned-cards';

const MAX_COMPARE_IDS = 4;

export async function GET(request: NextRequest) {
  if (!rateLimit(`tcg-compare:${ipKey(request)}`, 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const lang = request.nextUrl.searchParams.get('lang') ?? 'en';
    const ids = request.nextUrl.searchParams.get('ids')?.split(',').map((id) => id.trim()).filter(Boolean) ?? [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
    }

    if (ids.length > MAX_COMPARE_IDS || !ids.every((id) => isValidTcgCardId(id))) {
      return NextResponse.json({ error: `Invalid ids (max ${MAX_COMPARE_IDS})` }, { status: 400 });
    }

    const cards = await Promise.all(ids.map(async (id) => getTCGCardCached(id, lang)));

    return NextResponse.json(
      {
        cards: cards.filter((card): card is NonNullable<typeof card> => Boolean(card)),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch (error) {
    console.error('[TCG API] Failed to compare cards:', error);
    return NextResponse.json({ error: 'Failed to compare cards' }, { status: 502 });
  }
}
