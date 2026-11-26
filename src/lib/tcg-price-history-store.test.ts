import { describe, expect, it, vi } from 'vitest';
import type { NeonSql } from '@/lib/neon/server';
import { upsertQualifiedCardmarketObservations } from './tcg-price-history-store';

describe('qualified TCG price history persistence', () => {
  it('treats an upsert with no returned row as already current', async () => {
    const sqlMock = vi.fn().mockResolvedValue([]);
    const observation = {
      cardId: 'base1-4',
      setId: 'base1',
      cardLanguage: 'fr' as const,
      cardmarketProductId: 1234,
      variant: 'holo' as const,
      source: 'tcgdex-cardmarket' as const,
      metric: 'trend' as const,
      currency: 'EUR' as const,
      value: 125.5,
      sourceObservedAt: '2026-11-06T13:00:00.000Z',
      sourceDay: '2026-11-06',
    };

    const captured = await upsertQualifiedCardmarketObservations(sqlMock as unknown as NeonSql, [observation]);

    expect(captured).toBe(0);
    expect(sqlMock).toHaveBeenCalledOnce();
    const query = sqlMock.mock.calls[0][0].join(' ');
    expect(query).toContain('on conflict');
    expect(query).toContain('cardmarket_product_id, set_id, variant');
    expect(query).toContain('where excluded.source_observed_at >');
  });
});
