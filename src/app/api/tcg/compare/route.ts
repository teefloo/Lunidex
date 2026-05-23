import { NextRequest, NextResponse } from 'next/server';
import { getTCGCard } from '@/lib/api/tcg';

export async function GET(request: NextRequest) {
  try {
    const lang = request.nextUrl.searchParams.get('lang') ?? 'en';
    const ids = request.nextUrl.searchParams.get('ids')?.split(',').map((id) => id.trim()).filter(Boolean) ?? [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
    }

    const cards = await Promise.all(ids.map(async (id) => getTCGCard(id, lang)));

    return NextResponse.json({
      cards: cards.filter((card): card is NonNullable<typeof card> => Boolean(card)),
    });
  } catch (error) {
    console.error('[TCG API] Failed to compare cards:', error);
    return NextResponse.json({ error: 'Failed to compare cards' }, { status: 502 });
  }
}
