import { afterEach, describe, expect, it, vi } from 'vitest';

const poolMock = vi.hoisted(() => ({
  connect: vi.fn(),
  on: vi.fn(),
  query: vi.fn(),
}));

vi.mock('pg', () => ({
  Pool: vi.fn(function MockPool() {
    return poolMock;
  }),
}));

import { getSupabaseDatabaseClient } from './database';

const globalPool = globalThis as typeof globalThis & { __lunidexSupabasePool?: unknown };

afterEach(() => {
  delete process.env.SUPABASE_DATABASE_URL;
  delete globalPool.__lunidexSupabasePool;
  vi.clearAllMocks();
});

describe('Supabase SQL transaction execution', () => {
  it('serializes transaction queries, preserves tuple results, and drains before rollback on failure', async () => {
    const events: string[] = [];
    let queryInFlight = false;
    const transactionClient = {
      query: vi.fn(async (text: string) => {
        if (queryInFlight) throw new Error('Concurrent query on one PoolClient');
        queryInFlight = true;
        events.push(`start:${text}`);
        await new Promise((resolve) => setTimeout(resolve, 1));
        events.push(`finish:${text}`);
        queryInFlight = false;
        if (text === 'FAIL') throw new Error('Synthetic query failure');
        return { rows: [{ statement: text }] };
      }),
      release: vi.fn(() => events.push('release')),
    };
    poolMock.connect.mockResolvedValue(transactionClient);
    process.env.SUPABASE_DATABASE_URL = 'postgresql://local-test.invalid/postgres';

    const sql = getSupabaseDatabaseClient();
    if (!sql) throw new Error('Expected a configured test database client.');

    const results = await sql.transaction((tx) => [
      tx.query('FIRST'),
      tx.query('SECOND'),
      tx.query('THIRD'),
    ]);

    expect(results).toEqual([
      [{ statement: 'FIRST' }],
      [{ statement: 'SECOND' }],
      [{ statement: 'THIRD' }],
    ]);
    expect(events).toEqual([
      'start:BEGIN', 'finish:BEGIN',
      'start:FIRST', 'finish:FIRST',
      'start:SECOND', 'finish:SECOND',
      'start:THIRD', 'finish:THIRD',
      'start:COMMIT', 'finish:COMMIT',
      'release',
    ]);

    events.length = 0;
    await expect(sql.transaction((tx) => [
      tx.query('BEFORE_FAILURE'),
      tx.query('FAIL'),
      tx.query('MUST_NOT_RUN'),
    ])).rejects.toThrow('Synthetic query failure');

    expect(events).toEqual([
      'start:BEGIN', 'finish:BEGIN',
      'start:BEFORE_FAILURE', 'finish:BEFORE_FAILURE',
      'start:FAIL', 'finish:FAIL',
      'start:ROLLBACK', 'finish:ROLLBACK',
      'release',
    ]);
  });
});
