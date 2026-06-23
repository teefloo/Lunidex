import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ cardId: string }>;
}

export const runtime = 'edge';

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { cardId } = await params;

  if (!cardId || cardId.trim() === '') {
    return NextResponse.json({ error: 'Missing cardId' }, { status: 400 });
  }

  const daysParam = request.nextUrl.searchParams.get('days');
  const days = daysParam === '7' ? 7 : daysParam === '90' ? 90 : 30;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ history: [] });
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('tcg_price_history')
    .select(
      'id, card_id, card_name, set_id, tcgplayer_low, tcgplayer_mid, tcgplayer_high, cardmarket_avg, cardmarket_low, cardmarket_trend, recorded_at',
    )
    .eq('card_id', cardId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  if (error) {
    console.error('[price-history] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
  }

  return NextResponse.json(
    { history: data ?? [] },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    },
  );
}
