import { NextRequest, NextResponse } from 'next/server';
import { getTCGCard } from '@/lib/api/tcg';

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') ?? 'en';
  const ids = request.nextUrl.searchParams.get('ids')?.split(',').map((id) => id.trim()).filter(Boolean) ?? [];

  const cards = await Promise.all(ids.map(async (id) => getTCGCard(id, lang)));

  return NextResponse.json({
    cards: cards.filter((card): card is NonNullable<typeof card> => Boolean(card)),
  });
}
