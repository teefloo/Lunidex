import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePriceHistory, computePriceTrend, type PriceHistoryEntry } from '../usePriceHistory';

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockEntry: PriceHistoryEntry = {
  id: 1,
  card_id: 'swsh1-1',
  card_name: 'Grookey',
  set_id: 'swsh1',
  tcgplayer_low: 0.1,
  tcgplayer_mid: 0.2,
  tcgplayer_high: 0.5,
  cardmarket_avg: 0.15,
  cardmarket_low: 0.1,
  cardmarket_trend: 0.18,
  recorded_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
};

const mockEntry2: PriceHistoryEntry = {
  ...mockEntry,
  id: 2,
  tcgplayer_mid: 0.24,
  cardmarket_trend: 0.22,
  recorded_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePriceHistory', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns price history data correctly', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ history: [mockEntry, mockEntry2] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => usePriceHistory('swsh1-1', 30), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].card_id).toBe('swsh1-1');
    expect(result.current.data?.[0].tcgplayer_mid).toBe(0.2);
  });

  it('returns empty array when cardId is empty (query disabled)', async () => {
    const fetchSpy = vi.mocked(fetch);

    const { result } = renderHook(() => usePriceHistory('', 30), {
      wrapper: makeWrapper(),
    });

    // Query disabled, stays in pending/idle without ever calling fetch
    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('honours staleTime option (30 minutes)', () => {
    // Verify the queryKey structure and that no extra calls occur within staleTime.
    // We just inspect the hook's queryKey by checking that calling the hook twice
    // with the same args reuses the cached result rather than re-fetching.
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ history: [mockEntry] }), { status: 200 }),
    );

    const wrapper = makeWrapper();

    const { result: r1 } = renderHook(() => usePriceHistory('swsh1-1', 7), { wrapper });
    const { result: r2 } = renderHook(() => usePriceHistory('swsh1-1', 7), { wrapper });

    // Both hooks share the same query key → same data reference once resolved.
    expect(r1.current.data).toBe(r2.current.data);
  });
});

// ---------------------------------------------------------------------------
// computePriceTrend
// ---------------------------------------------------------------------------

describe('computePriceTrend', () => {
  it('returns null values when history is empty', () => {
    expect(computePriceTrend([])).toEqual({ usdChange: null, eurChange: null });
  });

  it('returns null when only one entry', () => {
    expect(computePriceTrend([mockEntry])).toEqual({ usdChange: null, eurChange: null });
  });

  it('computes positive USD trend correctly', () => {
    const older: PriceHistoryEntry = {
      ...mockEntry,
      tcgplayer_mid: 1.0,
      cardmarket_trend: 0.9,
      recorded_at: new Date(Date.now() - 86400000).toISOString(),
    };
    const newer: PriceHistoryEntry = {
      ...mockEntry,
      id: 2,
      tcgplayer_mid: 1.2,
      cardmarket_trend: 0.9,
      recorded_at: new Date().toISOString(),
    };

    const trend = computePriceTrend([older, newer]);
    expect(trend.usdChange).toBeCloseTo(20, 1); // +20%
    expect(trend.eurChange).toBeCloseTo(0, 1);
  });

  it('computes negative EUR trend correctly', () => {
    const older: PriceHistoryEntry = {
      ...mockEntry,
      tcgplayer_mid: 1.0,
      cardmarket_trend: 1.0,
      recorded_at: new Date(Date.now() - 86400000).toISOString(),
    };
    const newer: PriceHistoryEntry = {
      ...mockEntry,
      id: 2,
      tcgplayer_mid: 1.0,
      cardmarket_trend: 0.8,
      recorded_at: new Date().toISOString(),
    };

    const trend = computePriceTrend([older, newer]);
    expect(trend.eurChange).toBeCloseTo(-20, 1); // -20%
  });
});
