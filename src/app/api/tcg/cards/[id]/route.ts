import { NextRequest, NextResponse } from 'next/server';
import { getTCGCardCached } from '@/lib/api/server-cache';
import { isValidTcgCardId } from '@/lib/tcg-owned-cards';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    if (!isValidTcgCardId(id)) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const lang = request.nextUrl.searchParams.get('lang') ?? 'en';
    const card = await getTCGCardCached(id, lang);

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json(
      { card },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch (error) {
    console.error('[TCG API] Failed to fetch card detail:', error);
    return NextResponse.json({ error: 'Failed to fetch card' }, { status: 502 });
  }
}
