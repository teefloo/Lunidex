import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeTCGCollectionCardKey, encodeTCGCollectionKey } from '@primedex/core/lib/tcg-collections';
import type { NeonSql } from '@/lib/neon/server';
import { listCardHoldings, setCardHolding } from '@/lib/public-api-tcg';

const { getTCGCardCached } = vi.hoisted(() => ({ getTCGCardCached: vi.fn() }));
vi.mock('@/lib/api/server-cache', () => ({ getTCGCardCached }));

const userId = '00000000-0000-4000-8000-000000000001';
const collectionKey = encodeTCGCollectionKey('en', 'base1')!;

function makeState(quantity: number) {
  return {
    tcgOwnedCards: ['base1-001'],
    tcgLegacyOwnedCards: [],
    tcgCollections: [collectionKey],
    tcgCollectionCards: [encodeTCGCollectionCardKey(collectionKey, 'base1-001', 'normal', quantity)!],
    tcgActiveCollections: [collectionKey],
    tcgCollectionModelVersion: 3,
    favorites: [25],
    __sync: {
      version: 3,
      clock: 50,
      fields: { favorites: { clock: 21, deviceId: 'mobile' } },
      collections: {
        favorites: { '25': { clock: 22, deviceId: 'mobile', present: true } },
        tcgCollectionCards: {
          [encodeTCGCollectionCardKey(collectionKey, 'base1-001', 'normal', 1)!.replace(/\|1$/, '')]: {
            clock: 9, deviceId: 'mobile', present: true,
          },
        },
      },
    },
  };
}

function makeSql(initial: unknown) {
  let state = initial as Record<string, unknown>;
  let updatedAt = '2026-09-26T10:00:00.000Z';
  const query = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const statement = strings.join('?');
    if (statement.includes('select data, updated_at::text as updated_at')) {
      return [{ data: state, updated_at: updatedAt }];
    }
    if (statement.includes('update public.user_state')) {
      state = JSON.parse(String(values[0])) as Record<string, unknown>;
      updatedAt = '2026-09-26T10:01:00.000Z';
      return [{ data: state, updated_at: updatedAt }];
    }
    throw new Error(`Unexpected SQL in public API test: ${statement}`);
  });
  return {
    sql: query as unknown as NeonSql,
    query,
    get state() { return state; },
  };
}

describe('public API card holdings', () => {
  beforeEach(() => {
    getTCGCardCached.mockReset();
    getTCGCardCached.mockResolvedValue({
      id: 'base1-001',
      localId: '001',
      name: 'Example',
      set: { id: 'base1', name: 'Base Set', cardCount: { official: 102 } },
      variants: { normal: true, reverse: true },
    });
  });

  it('lists older holdings that have no known language', () => {
    const state = {
      ...makeState(1),
      tcgLegacyOwnedCards: ['old-card-id'],
      tcgOwnedCards: ['base1-001', 'old-card-id'],
    };
    const holdings = listCardHoldings(state);
    expect(holdings).toContainEqual(expect.objectContaining({
      cardId: 'old-card-id', language: null, legacy: true, quantity: 1,
    }));
  });

  it('removes a legacy holding when an absolute API write sets its quantity to zero', async () => {
    getTCGCardCached.mockResolvedValue(null);
    const legacyState = {
      ...makeState(1),
      tcgOwnedCards: ['old-card-id'],
      tcgLegacyOwnedCards: ['old-card-id'],
      tcgCollections: [],
      tcgCollectionCards: [],
      tcgActiveCollections: [],
    };
    const db = makeSql(legacyState);

    const result = await setCardHolding(db.sql, userId, '00000000-0000-4000-8000-000000000002', {
      cardId: 'old-card-id', language: 'en', variant: 'unspecified', quantity: 0,
    });

    expect(result.holding.quantity).toBe(0);
    expect(db.state).toMatchObject({ tcgLegacyOwnedCards: [], tcgOwnedCards: [] });
    expect(getTCGCardCached).not.toHaveBeenCalled();
  });

  it('writes absolute quantities with sync clocks and preserves unrelated sync metadata', async () => {
    const db = makeSql(makeState(1));
    const result = await setCardHolding(db.sql, userId, '00000000-0000-4000-8000-000000000002', {
      cardId: 'base1-001', language: 'en', variant: 'normal', quantity: 3,
    });

    expect(result.holding.quantity).toBe(3);
    const state = db.state as ReturnType<typeof makeState>;
    expect(state.tcgCollectionCards).toEqual([encodeTCGCollectionCardKey(collectionKey, 'base1-001', 'normal', 3)]);
    expect(state.__sync.clock).toBeGreaterThan(50);
    expect(state.__sync.collections.favorites['25']).toEqual({ clock: 22, deviceId: 'mobile', present: true });
    expect(db.query.mock.calls[0].slice(1)).toContain(userId);
    expect(db.query.mock.calls[1].slice(1)).toContain(userId);

    await setCardHolding(db.sql, userId, '00000000-0000-4000-8000-000000000002', {
      cardId: 'base1-001', language: 'en', variant: 'normal', quantity: 0,
    });
    const removedState = db.state as ReturnType<typeof makeState>;
    expect(removedState.tcgCollectionCards).toEqual([]);
    expect(removedState.tcgCollections).toEqual([collectionKey]);
    expect(getTCGCardCached).toHaveBeenCalledTimes(1);
  });
});
