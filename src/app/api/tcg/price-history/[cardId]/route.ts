import { NextRequest, NextResponse } from 'next/server';
import { getNeonClient } from '@/lib/neon/server';
import { getTCGCardCached } from '../../../../../lib/api/server-cache';
import { isValidTcgCardId } from '@/lib/tcg-owned-cards';

/** Minimum interval between two recorded snapshots for the same card. */
const SNAPSHOT_MIN_INTERVAL_HOURS = 6;

interface TCGPlayerPriceTier {
  lowPrice?: number | null;
  midPrice?: number | null;
  highPrice?: number | null;
}

interface CardPricing {
  tcgplayer?: Record<string, TCGPlayerPriceTier | string | undefined>;
  cardmarket?: {
    avg?: number | null;
    low?: number | null;
    trend?: number | null;
  };
}

interface PriceSnapshot {
  tcgplayer_low: number | null;
  tcgplayer_mid: number | null;
  tcgplayer_high: number | null;
  cardmarket_avg: number | null;
  cardmarket_low: number | null;
  cardmarket_trend: number | null;
}

function toFiniteNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Extracts the same price tiers the Supabase poller was designed to store,
 * from the live TCGdex card payload already used across the app.
 */
function extractPriceSnapshot(card: { pricing?: CardPricing }): PriceSnapshot {
  const tcgplayer = card.pricing?.tcgplayer ?? {};
  const tier =
    (tcgplayer['holofoil'] as TCGPlayerPriceTier | undefined) ??
    (tcgplayer['normal'] as TCGPlayerPriceTier | undefined) ??
    null;
  const cardmarket = card.pricing?.cardmarket;

  return {
    tcgplayer_low: toFiniteNumberOrNull(tier?.lowPrice),
    tcgplayer_mid: toFiniteNumberOrNull(tier?.midPrice),
    tcgplayer_high: toFiniteNumberOrNull(tier?.highPrice),
    cardmarket_avg: toFiniteNumberOrNull(cardmarket?.avg),
    cardmarket_low: toFiniteNumberOrNull(cardmarket?.low),
    cardmarket_trend: toFiniteNumberOrNull(cardmarket?.trend),
  };
}

function hasAnyPrice(snapshot: PriceSnapshot): boolean {
  return Object.values(snapshot).some((value) => value !== null);
}

async function recordSnapshotIfDue(
  sql: NonNullable<ReturnType<typeof getNeonClient>>,
  cardId: string,
): Promise<void> {
  try {
    const [latest] = await sql`
      select recorded_at
      from public.tcg_price_history
      where card_id = ${cardId}
      order by recorded_at desc
      limit 1
    ` as Array<{ recorded_at: string }>;

    if (
      latest?.recorded_at &&
      Date.now() - new Date(latest.recorded_at).getTime() <
        SNAPSHOT_MIN_INTERVAL_HOURS * 60 * 60 * 1000
    ) {
      return;
    }

    // The cached fetcher keeps upstream load bounded while still refreshing
    // at least hourly, so snapshots stay real without hammering TCGdex.
    const card = await getTCGCardCached(cardId, 'en');
    if (!card) return;

    const snapshot = extractPriceSnapshot(card);
    if (!hasAnyPrice(snapshot)) return;

    await sql`
      insert into public.tcg_price_history
        (card_id, card_name, set_id, tcgplayer_low, tcgplayer_mid,
         tcgplayer_high, cardmarket_avg, cardmarket_low, cardmarket_trend)
      values
        (${cardId}, ${card.name ?? ''}, ${card.set?.id ?? ''},
         ${snapshot.tcgplayer_low}, ${snapshot.tcgplayer_mid},
         ${snapshot.tcgplayer_high}, ${snapshot.cardmarket_avg},
         ${snapshot.cardmarket_low}, ${snapshot.cardmarket_trend})
    `;
  } catch (error) {
    console.error('[price-history] Failed to record snapshot:', error);
  }
}

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

  if (!isValidTcgCardId(cardId)) {
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

  await recordSnapshotIfDue(sql, cardId);

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
