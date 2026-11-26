import { describe, expect, it, vi } from 'vitest';
import type { NeonSql } from '@/lib/neon/server';
import type { TCGCard } from '@/types/tcg';
import {
  claimDuePriceHistoryRefreshTargets,
  DAILY_PRICE_HISTORY_REFRESH_LIMIT,
  recordPriceHistoryCardSeen,
  refreshTrackedPriceHistoryCards,
  type PriceHistoryRefreshTarget,
} from './tcg-price-history-refresh';

function targets(count: number): PriceHistoryRefreshTarget[] {
  return Array.from({ length: count }, (_, index) => ({
    card_id: `base1-${index + 1}`,
    card_language: index % 2 === 0 ? 'fr' : 'en',
  }));
}

function card(id: string): TCGCard {
  return { id, localId: '1', name: 'Bulbasaur' };
}

describe('daily price history refresh tracking', () => {
  it('records only card and language with seen and checked timestamps', async () => {
    const sqlMock = vi.fn().mockResolvedValue([]);
    const checkedAt = new Date('2026-11-06T12:00:00.000Z');

    await recordPriceHistoryCardSeen(sqlMock as unknown as NeonSql, 'base1-4', 'fr', checkedAt);

    expect(sqlMock).toHaveBeenCalledOnce();
    const [strings, ...values] = sqlMock.mock.calls[0];
    expect(strings.join(' ')).toContain('insert into public.tcg_price_history_refresh_targets');
    expect(strings.join(' ')).toContain('last_seen_at = excluded.last_seen_at');
    expect(strings.join(' ')).toContain('last_checked_at = excluded.last_checked_at');
    expect(values).toEqual(['base1-4', 'fr', checkedAt.toISOString(), checkedAt.toISOString()]);
  });

  it('claims no more than twenty due cards and atomically stamps them checked', async () => {
    const sqlMock = vi.fn().mockResolvedValue(targets(25));

    const claimed = await claimDuePriceHistoryRefreshTargets(sqlMock as unknown as NeonSql);

    expect(claimed).toHaveLength(DAILY_PRICE_HISTORY_REFRESH_LIMIT);
    const [strings, limit] = sqlMock.mock.calls[0];
    expect(strings.join(' ')).toContain('last_seen_at >= now() - interval \'180 days\'');
    expect(strings.join(' ')).toContain('last_checked_at < date_trunc');
    expect(strings.join(' ')).toContain('for update skip locked');
    expect(strings.join(' ')).toContain('set last_checked_at = now()');
    expect(strings.join(' ')).toContain('limit ');
    expect(limit).toBe(DAILY_PRICE_HISTORY_REFRESH_LIMIT);
  });

  it('refreshes at most twenty cards with the exact requested language', async () => {
    const fetchLocalizedCard = vi.fn(async (cardId: string) => card(cardId));
    const capture = vi.fn(async () => 1);
    const reportError = vi.fn();

    const result = await refreshTrackedPriceHistoryCards(targets(24), { fetchLocalizedCard, capture, reportError });

    expect(result).toEqual({ attempted: 20, captured: 20, failed: 0 });
    expect(fetchLocalizedCard).toHaveBeenCalledTimes(20);
    expect(fetchLocalizedCard).toHaveBeenNthCalledWith(1, 'base1-1', 'fr');
    expect(fetchLocalizedCard).toHaveBeenNthCalledWith(2, 'base1-2', 'en');
  });

  it('continues after one localized fetch fails and does not capture a mismatched card', async () => {
    const fetchLocalizedCard = vi.fn(async (cardId: string) => {
      if (cardId === 'base1-1') throw new Error('TCGdex unavailable');
      if (cardId === 'base1-2') return card('base1-other');
      return card(cardId);
    });
    const capture = vi.fn(async () => 1);
    const reportError = vi.fn();

    const result = await refreshTrackedPriceHistoryCards(targets(3), { fetchLocalizedCard, capture, reportError });

    expect(result).toEqual({ attempted: 3, captured: 1, failed: 2 });
    expect(fetchLocalizedCard).toHaveBeenNthCalledWith(1, 'base1-1', 'fr');
    expect(capture).toHaveBeenCalledOnce();
    expect(capture).toHaveBeenCalledWith(card('base1-3'), 'fr');
    expect(reportError).toHaveBeenCalledTimes(2);
  });
});
