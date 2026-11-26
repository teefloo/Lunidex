import { describe, expect, it } from 'vitest';
import type { NeonSql } from '@/lib/neon/server';
import { getPublicSealedGuide } from './tcg-sealed-guide-server';

const asOf = '2026-09-28';
const products = Array.from({ length: 25 }, (_, index) => ({ cardmarket_product_id: index + 1, name: `Product ${index + 1}`, expansion_id: 6569, active: true }));
const basket = { version: 'launch-v1', day: '2026-09-20', sourceAt: '2026-09-20T06:00:00.000Z', items: products.map((product) => ({ productId: product.cardmarket_product_id, trendCents: 1000 })) };
const point = (id: number, day: string, trend: number) => ({ cardmarket_product_id: id, day, source_at: `${day}T06:00:00.000Z`, trend_cents: trend });

function database() {
  const statements: string[] = [];
  const query = async (statement: string) => {
    statements.push(statement);
    if (statement.includes('tcg_sealed_settings')) return [{ value: basket }];
    if (statement.includes('tcg_sealed_products')) return products;
    if (statement.includes('unnest(')) return products.flatMap((product) => [point(product.cardmarket_product_id, asOf, 1200), point(product.cardmarket_product_id, '2026-09-27', 1000)]);
    if (statement.includes('tcg_sealed_price_snapshots')) return products.map((product) => ({ ...point(product.cardmarket_product_id, asOf, 1200), source_at: '2026-09-28T06:00:00.000Z' }));
    throw new Error('Unexpected database query');
  };
  return { sql: { query } as unknown as NeonSql, statements };
}

describe('public sealed guide data boundary', () => {
  it('reads only global source data and the immutable basket setting', async () => {
    const { sql, statements } = database();
    const result = await getPublicSealedGuide(sql, asOf);
    expect(result.index).toMatchObject({ status: 'available', points: [
      { day: '2026-09-20', value: 100 },
      { day: '2026-09-28', sourceAt: '2026-09-28T06:00:00.000Z', value: 120 },
    ] });
    expect(result.products).toMatchObject({ status: 'available' });
    expect(result.series).toMatchObject({ status: 'unavailable', reason: 'insufficient_coverage' });
    expect(statements).toHaveLength(4);
    expect(statements[2]).toContain('source_at >= $2::timestamptz');
    expect(statements[2]).toContain('order by source_at asc, cardmarket_product_id asc');
    expect(statements[3]).toContain('source_at < $2::timestamptz');
    expect(statements[3]).toContain('order by source_at desc');
    expect(statements[3]).toContain('as product_ids(cardmarket_product_id)');
    expect(statements[3]).toContain('product_ids.cardmarket_product_id');
    expect(statements.join(' ')).not.toMatch(/tcg_sealed_(transactions|allocations|portfolio_daily|aliases|audit|user_revisions)/);
  });
});
