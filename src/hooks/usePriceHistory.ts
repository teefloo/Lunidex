import { useQuery } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PriceHistoryEntry {
  id: number;
  card_id: string;
  card_name: string;
  set_id: string;
  tcgplayer_low: number | null;
  tcgplayer_mid: number | null;
  tcgplayer_high: number | null;
  cardmarket_avg: number | null;
  cardmarket_low: number | null;
  cardmarket_trend: number | null;
  recorded_at: string;
}

export interface PriceTrend {
  /** Percentage change over the window (null when not enough data). */
  usdChange: number | null;
  eurChange: number | null;
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchPriceHistory(
  cardId: string,
  days: 7 | 30 | 90,
): Promise<PriceHistoryEntry[]> {
  const params = new URLSearchParams({ days: String(days) });
  const res = await fetch(`/api/tcg/price-history/${encodeURIComponent(cardId)}?${params}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch price history for ${cardId}: ${res.status}`);
  }
  const data = (await res.json()) as { history?: PriceHistoryEntry[] };
  return Array.isArray(data.history) ? data.history : [];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches price history for a TCG card over the last N days.
 * staleTime is 30 min — data is polled server-side every 6h anyway.
 */
export function usePriceHistory(cardId: string, days: 7 | 30 | 90 = 30) {
  return useQuery({
    queryKey: ['tcg-price-history', cardId, days],
    queryFn: () => fetchPriceHistory(cardId, days),
    staleTime: 30 * 60 * 1000, // 30 min
    enabled: Boolean(cardId),
  });
}

// ---------------------------------------------------------------------------
// Utility: compute 7-day trend from history data
// ---------------------------------------------------------------------------

export function computePriceTrend(history: PriceHistoryEntry[]): PriceTrend {
  if (history.length < 2) return { usdChange: null, eurChange: null };

  const sorted = [...history].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );

  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];

  function pct(prev: number | null, next: number | null): number | null {
    if (prev == null || next == null || prev === 0) return null;
    return ((next - prev) / Math.abs(prev)) * 100;
  }

  return {
    usdChange: pct(oldest.tcgplayer_mid ?? oldest.tcgplayer_low, newest.tcgplayer_mid ?? newest.tcgplayer_low),
    eurChange: pct(oldest.cardmarket_trend ?? oldest.cardmarket_avg, newest.cardmarket_trend ?? newest.cardmarket_avg),
  };
}
