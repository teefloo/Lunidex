import { NextRequest, NextResponse } from 'next/server';
import { getNeonClient } from '@/lib/neon/server';

interface RouteParams {
  params: Promise<{ cardId: string }>;
}

type NumericValue = number | string | null;

interface PriceHistoryRow {
  id: number | string;
  card_id: string;
  card_name: string;
  set_id: string;
  tcgplayer_low: NumericValue;
  tcgplayer_mid: NumericValue;
  tcgplayer_high: NumericValue;
  cardmarket_avg: NumericValue;
  cardmarket_low: NumericValue;
  cardmarket_trend: NumericValue;
  recorded_at: string;
}

export const runtime = 'edge';

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { cardId } = await params;

  if (!cardId || cardId.trim() === '' || cardId.length > 128) {
    return NextResponse.json({ error: 'Missing cardId' }, { status: 400 });
  }

  const daysParam = request.nextUrl.searchParams.get('days');
  const days = daysParam === '7' ? 7 : daysParam === '90' ? 90 : 30;

  const sql = getNeonClient();
  if (!sql) {
    return NextResponse.json({ history: [] });
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const rows = await sql`
    select id, card_id, card_name, set_id,
      tcgplayer_low, tcgplayer_mid, tcgplayer_high,
      cardmarket_avg, cardmarket_low, cardmarket_trend, recorded_at
    from public.tcg_price_history
    where card_id = ${cardId}
      and recorded_at >= ${since}::timestamptz
    order by recorded_at asc
  ` as PriceHistoryRow[];

  const history = rows.map((row) => ({
    id: Number(row.id),
    card_id: row.card_id,
    card_name: row.card_name,
    set_id: row.set_id,
    tcgplayer_low: row.tcgplayer_low === null ? null : Number(row.tcgplayer_low),
    tcgplayer_mid: row.tcgplayer_mid === null ? null : Number(row.tcgplayer_mid),
    tcgplayer_high: row.tcgplayer_high === null ? null : Number(row.tcgplayer_high),
    cardmarket_avg: row.cardmarket_avg === null ? null : Number(row.cardmarket_avg),
    cardmarket_low: row.cardmarket_low === null ? null : Number(row.cardmarket_low),
    cardmarket_trend: row.cardmarket_trend === null ? null : Number(row.cardmarket_trend),
    recorded_at: row.recorded_at,
  }));

  return NextResponse.json(
    { history },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    },
  );
}
