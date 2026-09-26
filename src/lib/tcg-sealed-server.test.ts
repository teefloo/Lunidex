import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SealedPriceSnapshot, SealedProduct, SealedTransaction } from '@primedex/core';
import type { NeonSql } from '@/lib/neon/server';
import {
  getSealedOverview,
  getSealedPortfolioDaily,
  getSealedTransaction,
  getSealedTransactionPage,
  normalizeSealedDraft,
  mutateSealedTransaction,
  SealedConflictError,
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

describe('sealed API idempotency', () => {
  it('replays the original transaction without reading or mutating the journal again', async () => {
    const transaction = detailTransaction({ id: 'original-transaction' });
    const statements: string[] = [];
    const sql = (async (strings: TemplateStringsArray) => {
      const statement = strings.join('?');
      statements.push(statement);
      if (statement.includes('from public.api_idempotency')) {
        return [{ request_hash: 'a'.repeat(64), response: { transaction, revision: 8, allocations: [] } }];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    }) as unknown as NeonSql;

    const result = await mutateSealedTransaction(sql, '00000000-0000-4000-8000-000000000001', {}, {
      mode: 'create',
      expectedRevision: 7,
      idempotency: { keyHash: 'b'.repeat(64), requestHash: 'a'.repeat(64) },
    });

    expect(result).toMatchObject({ transaction, revision: 8, allocations: [], replayed: true });
    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain('expires_at > now()');
  });

  it('rejects reuse of an idempotency key with a different request hash', async () => {
    const sql = (async () => [{
      request_hash: 'a'.repeat(64),
      response: { transaction: detailTransaction({ id: 'original-transaction' }), revision: 8, allocations: [] },
    }]) as unknown as NeonSql;
    await expect(mutateSealedTransaction(sql, '00000000-0000-4000-8000-000000000001', {}, {
      mode: 'create',
      expectedRevision: 7,
      idempotency: { keyHash: 'b'.repeat(64), requestHash: 'c'.repeat(64) },
    })).rejects.toThrow('already used for a different request');
  });
});

describe('sealed API ownership scoping', () => {
  it('binds transaction detail and page queries to the authenticated account', async () => {
    const taggedCalls: unknown[][] = [];
    const queryCalls: Array<{ query: string; params: unknown[] }> = [];
    const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
      taggedCalls.push(values);
      return [];
    }) as unknown as TestSql;
    sql.query = async (query, params) => {
      queryCalls.push({ query, params });
      return [];
    };
    sql.transaction = async () => [];
    const accountId = '00000000-0000-4000-8000-000000000001';
    const transactionId = '00000000-0000-4000-8000-000000000002';

    await expect(getSealedTransaction(sql as unknown as NeonSql, accountId, transactionId)).resolves.toBeNull();
    await getSealedTransactionPage(sql as unknown as NeonSql, accountId, { limit: 25, productId: 123, kind: 'buy' });

    expect(taggedCalls[0]).toEqual([accountId, transactionId]);
    expect(queryCalls[0].query).toContain('where user_id = $1::uuid');
    expect(queryCalls[0].params).toEqual([accountId, 123, 'buy', 26]);
  });
});

function transactionRow(transaction: SealedTransaction): Record<string, unknown> {
  return {
    id: transaction.id,
    revision: transaction.revision,
    kind: transaction.kind,
    cardmarket_product_id: transaction.cardmarketProductId,
    exchange_give_product_id: transaction.exchangeGive?.cardmarketProductId ?? null,
    exchange_give_language: transaction.exchangeGive?.language ?? null,
    exchange_give_quantity: transaction.exchangeGive?.quantity ?? null,
    language: transaction.language,
    date: transaction.date,
    quantity: transaction.quantity,
    unit_price_cents: transaction.unitPriceCents,
    fees_cents: transaction.feesCents,
    shipping_cents: transaction.shippingCents,
    discount_cents: transaction.discountCents,
    payment_fees_cents: transaction.paymentFeesCents,
    other_costs_cents: transaction.otherCostsCents,
    platform: transaction.platform,
    counterparty: transaction.counterparty,
    notes: transaction.notes,
    storage: transaction.storage,
    allocation_method: transaction.allocationMethod,
    selections: transaction.selections,
    voided: transaction.voided,
    created_at: transaction.createdAt,
    updated_at: transaction.updatedAt,
  };
}

function makeMutationSql(options: {
  revision: number;
  transactions?: SealedTransaction[];
  guardConflict?: boolean;
  serializationFailure?: boolean;
  cachedResponse?: Record<string, unknown>;
}) {
  const statements: Array<{ statement: string; values: unknown[] }> = [];
  const mutationStatements: Array<{ statement: string; values: unknown[] }> = [];
  let transactionNumber = 0;
  let idempotencyLookups = 0;
  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const statement = strings.join('?');
    statements.push({ statement, values });
    if (statement.includes('from public.api_idempotency')) {
      idempotencyLookups += 1;
      return options.cachedResponse && idempotencyLookups > 1
        ? [{ request_hash: 'c'.repeat(64), response: options.cachedResponse }]
        : [];
    }
    if (statement.includes('from public.tcg_sealed_transactions')) {
      return (options.transactions ?? []).map(transactionRow);
    }
    return [];
  }) as unknown as TestSql;
  sql.query = async (query, params) => {
    if (query.includes('from public.tcg_sealed_products')) {
      const ids = params[1] as number[];
      return ids.map((id) => ({
        cardmarket_product_id: id,
        name: `Sealed product ${id}`,
        category_id: 53,
        category_name: 'Display',
        expansion_id: 1,
        cardmarket_url: `https://example.test/${id}`,
        image_available: false,
        source_at: '2026-09-01T00:00:00.000Z',
        updated_at: '2026-09-01T00:00:00.000Z',
        active: true,
        alias: null,
      }));
    }
    throw new Error(`Unexpected query in sealed mutation test: ${query}`);
  };
  const tx = ((strings: TemplateStringsArray, ...values: unknown[]) => ({
    statement: strings.join('?'), values,
  })) as unknown as NeonSql;
  const sqlWithTransaction = sql as unknown as {
    transaction: (callback: (transaction: NeonSql) => unknown[]) => Promise<unknown[][]>;
  };
  sqlWithTransaction.transaction = async (callback) => {
    const queries = callback(tx) as Array<{ statement: string; values: unknown[] }>;
    transactionNumber += 1;
    if (transactionNumber === 1) return [[], [{ revision: options.revision }]];
    mutationStatements.push(...queries);
    if (options.serializationFailure) throw Object.assign(new Error('serialization conflict'), { code: '40001' });
    const results = queries.map(() => [] as Array<Record<string, unknown>>);
    const revisionUpdate = queries.findIndex((query) => query.statement.includes('update public.tcg_sealed_user_revisions'));
    if (!options.guardConflict && revisionUpdate >= 0) {
      results[revisionUpdate] = [{ revision: options.revision + 1 }];
    }
    return results;
  };
  return { sql: sql as unknown as NeonSql, statements, mutationStatements };
}

const mutationUserId = '00000000-0000-4000-8000-000000000001';
const firstLotId = '00000000-0000-4000-8000-000000000021';

describe('sealed API transactional mutations', () => {
  it('creates a purchase atomically with its idempotency response', async () => {
    const db = makeMutationSql({ revision: 0 });
    const result = await mutateSealedTransaction(db.sql, mutationUserId, {
      kind: 'buy', cardmarketProductId: 100, language: 'en', date: '2026-09-26', quantity: 2, unitPriceCents: 1_200,
    }, {
      mode: 'create',
      expectedRevision: 0,
      idempotency: { keyHash: 'b'.repeat(64), requestHash: 'c'.repeat(64) },
    });

    expect(result).toMatchObject({ transaction: { kind: 'buy', cardmarketProductId: 100, quantity: 2 }, revision: 1, replayed: false });
    expect(db.mutationStatements.some((query) => query.statement.includes('insert into public.api_idempotency'))).toBe(true);
    expect(db.mutationStatements.some((query) => query.statement.includes('insert into public.tcg_sealed_audit'))).toBe(true);
    expect(db.mutationStatements.flatMap((query) => query.values)).not.toContain('raw-idempotency-key');
  });

  it('allocates a sale from the owned lot and stores the allocation', async () => {
    const purchase = detailTransaction({
      id: firstLotId, kind: 'buy', cardmarketProductId: 100, language: 'en', date: '2026-09-20', quantity: 2, unitPriceCents: 1_000,
    });
    const db = makeMutationSql({ revision: 1, transactions: [purchase] });
    const result = await mutateSealedTransaction(db.sql, mutationUserId, {
      kind: 'sell', cardmarketProductId: 100, language: 'en', date: '2026-09-26', quantity: 1, unitPriceCents: 1_500,
    }, { mode: 'create', expectedRevision: 1 });

    expect(result.transaction).toMatchObject({ kind: 'sell', quantity: 1 });
    expect(result.allocations).toEqual([expect.objectContaining({ lotId: firstLotId, quantity: 1, costCents: 1_000 })]);
    expect(db.mutationStatements.some((query) => query.statement.includes('insert into public.tcg_sealed_allocations'))).toBe(true);
  });

  it('records an exchange against the given lot and increments the revision', async () => {
    const purchase = detailTransaction({
      id: firstLotId, kind: 'buy', cardmarketProductId: 100, language: 'en', date: '2026-09-20', quantity: 2, unitPriceCents: 1_000,
    });
    const db = makeMutationSql({ revision: 1, transactions: [purchase] });
    const result = await mutateSealedTransaction(db.sql, mutationUserId, {
      kind: 'exchange', cardmarketProductId: 200, language: 'fr', date: '2026-09-26', quantity: 1,
      exchangeGive: { cardmarketProductId: 100, language: 'en', quantity: 1 },
    }, { mode: 'create', expectedRevision: 1 });

    expect(result.transaction).toMatchObject({ kind: 'exchange', cardmarketProductId: 200, exchangeGive: { cardmarketProductId: 100 } });
    expect(result.revision).toBe(2);
    expect(result.allocations).toEqual([expect.objectContaining({ lotId: firstLotId, quantity: 1, costCents: 1_000 })]);
  });

  it('voids an owned transaction and rejects a stale portfolio revision', async () => {
    const purchase = detailTransaction({
      id: firstLotId, kind: 'buy', cardmarketProductId: 100, language: 'en', date: '2026-09-20', quantity: 1, unitPriceCents: 1_000,
    });
    const db = makeMutationSql({ revision: 2, transactions: [purchase] });
    const result = await mutateSealedTransaction(db.sql, mutationUserId, {}, {
      mode: 'void', id: firstLotId, transactionRevision: 1, expectedRevision: 2,
    });
    expect(result.transaction).toMatchObject({ id: firstLotId, voided: true });
    expect(result.revision).toBe(3);

    const conflicted = makeMutationSql({ revision: 3, transactions: [purchase], guardConflict: true });
    await expect(mutateSealedTransaction(conflicted.sql, mutationUserId, {
      kind: 'buy', cardmarketProductId: 100, date: '2026-09-26', quantity: 1, unitPriceCents: 500,
    }, { mode: 'create', expectedRevision: 2 })).rejects.toBeInstanceOf(SealedConflictError);
  });

  it('replays a concurrent idempotent create after a serialization conflict', async () => {
    const transaction = detailTransaction({ id: firstLotId, cardmarketProductId: 100 });
    const db = makeMutationSql({
      revision: 0,
      serializationFailure: true,
      cachedResponse: { transaction, revision: 1, allocations: [] },
    });
    const result = await mutateSealedTransaction(db.sql, mutationUserId, {
      kind: 'buy', cardmarketProductId: 100, date: '2026-09-26', quantity: 1, unitPriceCents: 1_000,
    }, {
      mode: 'create', expectedRevision: 0,
      idempotency: { keyHash: 'b'.repeat(64), requestHash: 'c'.repeat(64) },
    });
    expect(result).toMatchObject({ transaction, revision: 1, replayed: true });
  });
});
