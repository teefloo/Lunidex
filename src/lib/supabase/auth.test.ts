import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseSql } from './database';
import { ensureSupabaseUser } from './auth';

const ownerId = '7d4d38a6-bc79-4fb7-b9f6-07e7f448a660';
const otherId = 'e3dc9ee8-46bd-4e1c-9be5-6802e8c0ad37';

function makeSql(recordedQueries: string[], active = true): SupabaseSql {
  const tag = (async (strings: TemplateStringsArray) => {
    const statement = strings.join(' ');
    recordedQueries.push(statement);
    if (statement.includes('select deletion_state')) return [{ deletion_state: active ? 'active' : 'pending' }];
    if (statement.includes('select\n        exists')) return active ? [{ profile_exists: true, user_state_exists: true }] : [];
    return [];
  }) as unknown as SupabaseSql;
  tag.transaction = async (callback) => {
    const tx = (async (strings: TemplateStringsArray) => {
      const statement = strings.join(' ');
      recordedQueries.push(statement);
      if (statement.includes('select deletion_state')) return [{ deletion_state: active ? 'active' : 'pending' }];
      if (statement.includes('select\n        exists')) return active ? [{ profile_exists: true, user_state_exists: true }] : [];
      return [];
    }) as never;
    return await Promise.all(callback(tx)) as never;
  };
  return tag;
}

describe('ensureSupabaseUser first-login provisioning', () => {
  beforeEach(() => vi.stubEnv('SUPABASE_ALLOWED_USER_ID', ownerId));
  afterEach(() => vi.unstubAllEnvs());

  it('creates only missing owner rows with conflict-safe inserts and preserves existing rows', async () => {
    const queries: string[] = [];
    const sql = makeSql(queries);
    const result = await ensureSupabaseUser(sql, {
      id: ownerId,
      email: 'owner@example.test',
      user_metadata: {},
    });

    expect(result).toBe(true);
    expect(queries.some((query) => query.includes('insert into app.users') && query.includes('on conflict (id) do nothing'))).toBe(true);
    expect(queries.some((query) => query.includes('insert into public.profiles') && query.includes('on conflict (id) do nothing'))).toBe(true);
    expect(queries.some((query) => query.includes('insert into public.user_state') && query.includes('on conflict (user_id) do nothing'))).toBe(true);
    expect(queries.some((query) => /^\s*(update|delete)\s/i.test(query))).toBe(false);
  });

  it('does not query or provision an account outside the allowlist', async () => {
    const queries: string[] = [];
    const sql = makeSql(queries);
    const result = await ensureSupabaseUser(sql, {
      id: otherId,
      email: 'other@example.test',
      user_metadata: {},
    });

    expect(result).toBe(false);
    expect(queries).toEqual([]);
  });

  it('fails closed without the server allowlist', async () => {
    vi.stubEnv('SUPABASE_ALLOWED_USER_ID', '');
    const queries: string[] = [];

    const result = await ensureSupabaseUser(makeSql(queries), {
      id: ownerId,
      email: 'owner@example.test',
      user_metadata: {},
    });

    expect(result).toBe(false);
    expect(queries).toEqual([]);
  });

  it('does not authorize provisioning while the application account is inactive', async () => {
    const queries: string[] = [];
    const result = await ensureSupabaseUser(makeSql(queries, false), {
      id: ownerId,
      email: 'owner@example.test',
      user_metadata: {},
    });

    expect(result).toBe(false);
    expect(queries).toHaveLength(5);
  });
});
