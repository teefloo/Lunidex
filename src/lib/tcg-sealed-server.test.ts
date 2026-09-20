import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SealedPriceSnapshot, SealedProduct, SealedTransaction } from '@primedex/core';
import type { NeonSql } from '@/lib/neon/server';
import {
  getSealedOverview,
  getSealedPortfolioDaily,
  normalizeSealedDraft,
  SealedServerError,
  sealedExportCsv,
  summarizeSealedProductDetail,
} from './tcg-sealed-server';

const detailProduct = (cardmarketProductId: number, name: string): SealedProduct => ({
  cardmarketProductId,
  name,
  categoryId: 53,
  categoryName: 'Display',
  expansionId: 1,
  cardmarketUrl: `https://example.test/${cardmarketProductId}`,
  imageAvailable: false,
  sourceAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  active: true,
});

const detailTransaction = (overrides: Partial<SealedTransaction>): SealedTransaction => ({
  id: 'detail-transaction',
  revision: 1,
  kind: 'buy',
  cardmarketProductId: 100,
  language: 'fr',
  date: '2026-09-01',
  quantity: 1,
  unitPriceCents: 1_000,
  feesCents: 0,
  shippingCents: 0,
  discountCents: 0,
  paymentFeesCents: 0,
  otherCostsCents: 0,
  platform: '',
  counterparty: '',
  notes: '',
  storage: '',
  allocationMethod: 'fifo',
  selections: [],
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  voided: false,
  ...overrides,
});

const detailPrice = (cardmarketProductId: number): SealedPriceSnapshot => ({
  cardmarketProductId,
  day: '2026-09-02',
  sourceAt: '2026-09-02T06:00:00.000Z',
  fetchedAt: '2026-09-02T07:00:00.000Z',
  metrics: {
    avgCents: 2_000,
    lowCents: 2_000,
    trendCents: 2_000,
    avg1Cents: 2_000,
    avg7Cents: 2_000,
    avg30Cents: 2_000,
  },
});

type TestSql = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
  query: (query: string, params: unknown[]) => Promise<unknown[]>;
  transaction: (callback: (tx: NeonSql) => unknown[]) => Promise<unknown[][]>;
};

function createOverviewSql(dailyRows: unknown[] = []) {
  const statements: string[] = [];
  const sql = (async (strings: TemplateStringsArray) => {
    const statement = strings.join('?');
    statements.push(statement);
    if (statement.includes('select day::text, data')) return dailyRows;
    return [];
  }) as unknown as TestSql;
  sql.query = async () => [];
  sql.transaction = async (callback) => {
    const tx = (async () => []) as unknown as NeonSql;
    callback(tx);
    return [[], [{ revision: 0 }]];
  };
  return { sql: sql as unknown as NeonSql, statements };
}

const validDailyPoint = {
  day: '2026-09-19',
  units: 0,
  costCents: 0,
  valueCents: 0,
  latentCents: 0,
  realizedCents: 0,
  totalCents: 0,
  spentCents: 0,
  grossSalesCents: 0,
  netSalesCents: 0,
  buyFeesCents: 0,
  sellFeesCents: 0,
  bought: 0,
  sold: 0,
  exchangeIn: 0,
  exchangeOut: 0,
  distinct: 0,
  missingPrices: 0,
  roi: null,
  cashFlowCents: 0,
  soldCostCents: 0,
  averageEntryCents: null,
  averageExitCents: null,
  holdingDays: null,
  winningSales: null,
  losingSales: null,
  profitPerSoldUnitCents: null,
  sellThrough: null,
};

afterEach(() => {
  vi.useRealTimers();
});

describe('sealed portfolio daily overview', () => {
  it('records the consulted current day even when there is no price snapshot', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'));
    const { sql, statements } = createOverviewSql();

    const overview = await getSealedOverview(sql, '00000000-0000-4000-8000-000000000001');

    expect(overview.history).toEqual([expect.objectContaining({ day: '2026-09-20', units: 0, valueCents: 0 })]);
    expect(statements.some((statement) => statement.includes('insert into public.tcg_sealed_portfolio_daily'))).toBe(true);
  });

  it('reads only valid daily rows and avoids casting the open-ended sentinel date', async () => {
    const dailyRows = [
      { day: '2026-09-19', data: validDailyPoint },
      { day: '2026-09-20', data: { day: '2026-09-20' } },
    ];
    const { sql, statements } = createOverviewSql(dailyRows);

    const allDays = await getSealedPortfolioDaily(sql, '00000000-0000-4000-8000-000000000001', '0000-01-01', '2026-09-20');

    expect(allDays).toEqual([validDailyPoint]);
    expect(statements[0]).toContain('day <=');
    expect(statements[0]).not.toContain('day >=');

    statements.length = 0;
    await getSealedPortfolioDaily(sql, '00000000-0000-4000-8000-000000000001', '2026-09-01', '2026-09-20');
    expect(statements[0]).toContain('day >=');
    expect(statements[0]).toContain('day <=');
  });

  it('merges persisted prior days while preferring the current calculation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'));
    const { sql } = createOverviewSql([
      { day: '2026-09-19', data: validDailyPoint },
      { day: '2026-09-20', data: { ...validDailyPoint, day: '2026-09-20', valueCents: 9_999 } },
    ]);

    const overview = await getSealedOverview(sql, '00000000-0000-4000-8000-000000000001');

    expect(overview.history.map((point) => point.day)).toEqual(['2026-09-19', '2026-09-20']);
    expect(overview.history.find((point) => point.day === '2026-09-20')?.valueCents).toBe(0);
  });
});

describe('sealed exchange server boundary', () => {
  it('replays the source purchase when loading a received exchange product detail', () => {
    const buy = detailTransaction({ id: 'source-buy' });
    const exchange = detailTransaction({
      id: 'received-exchange',
      kind: 'exchange',
      cardmarketProductId: 200,
      language: 'en',
      unitPriceCents: 0,
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
    });

    const summary = summarizeSealedProductDetail(
      [buy, exchange],
      [detailProduct(100, 'Given Display'), detailProduct(200, 'Received Display')],
      [detailPrice(200)],
      200,
      '2026-09-02',
    );

    expect(summary.positions).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardmarketProductId: 200, quantity: 1, costCents: 1_000, valueCents: 2_000 }),
    ]));
    expect(summary.positions).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ cardmarketProductId: 100 }),
    ]));
  });

  it('normalizes an exchange with zero monetary fields and default language', () => {
    expect(normalizeSealedDraft({
      kind: 'exchange',
      cardmarketProductId: 200,
      quantity: 1,
      date: '2026-09-10',
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
    })).toMatchObject({
      kind: 'exchange',
      language: 'unknown',
      unitPriceCents: 0,
      feesCents: 0,
      shippingCents: 0,
      discountCents: 0,
      paymentFeesCents: 0,
      otherCostsCents: 0,
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
    });
  });

  it('rejects nonzero exchange money or an incomplete give leg', () => {
    expect(() => normalizeSealedDraft({
      kind: 'exchange',
      cardmarketProductId: 200,
      quantity: 1,
      date: '2026-09-10',
      unitPriceCents: 1,
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
    })).toThrow(SealedServerError);

    expect(() => normalizeSealedDraft({
      kind: 'exchange',
      cardmarketProductId: 200,
      quantity: 1,
      date: '2026-09-10',
    })).toThrow(SealedServerError);
  });
});

describe('sealed exchange export', () => {
  it('exports received and given product details without removing existing columns', () => {
    const exported = {
      transactions: [{
        id: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
        kind: 'exchange',
        cardmarketProductId: 200,
        date: '2026-09-01',
        language: 'en',
        quantity: 1,
        unitPriceCents: 0,
        feesCents: 0,
        shippingCents: 0,
        discountCents: 0,
        paymentFeesCents: 0,
        otherCostsCents: 0,
        allocationMethod: 'fifo',
        voided: false,
        notes: '',
        exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
      }],
    } as Parameters<typeof sealedExportCsv>[0];

    const csv = sealedExportCsv(exported);

    expect(csv).toContain('"id"');
    expect(csv).toContain('"exchange_give_product_id"');
    expect(csv).toContain('"exchange_give_language"');
    expect(csv).toContain('"exchange_give_quantity"');
    expect(csv).toContain('"100","fr","1"');
  });
});
