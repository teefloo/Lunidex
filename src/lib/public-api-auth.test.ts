import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { NeonSql } from '@/lib/neon/server';
import {
  authenticateApiKey,
  createApiKey,
  createApiKeyMaterial,
  isApiContext,
  listApiKeys,
  revokeApiKey,
  runPublicApi,
  apiResponse,
  sha256,
} from '@/lib/public-api';

const { getNeonClient } = vi.hoisted(() => ({ getNeonClient: vi.fn() }));
vi.mock('@/lib/neon/server', () => ({ getNeonClient }));

const userId = '00000000-0000-4000-8000-000000000001';

function makeSql(rows: unknown[] = []) {
  const calls: Array<{ statement: string; values: unknown[] }> = [];
  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ statement: strings.join('?'), values });
    return rows;
  }) as unknown as NeonSql & { calls: typeof calls };
  sql.calls = calls;
  return sql;
}

function request(token: string): NextRequest {
  return new NextRequest('https://lunidex.app/api/v1/me', {
    headers: { Authorization: `Bearer ${token}`, 'x-forwarded-for': '198.51.100.5, 203.0.113.7' },
  });
}

function makeQuotaSql(permission: 'read' | 'read_write', blockedBuckets: string[] = []) {
  const material = createApiKeyMaterial();
  const directCalls: Array<{ statement: string; values: unknown[] }> = [];
  const transactionCalls: Array<{ statement: string; values: unknown[] }> = [];
  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const statement = strings.join('?');
    directCalls.push({ statement, values });
    if (statement.includes('from public.api_keys k')) {
      return [{ id: material.id, user_id: userId, key_hash: material.hash, permission, deletion_state: 'active' }];
    }
    if (statement.includes('select deletion_state')) return [{ deletion_state: 'active' }];
    return [];
  }) as unknown as NeonSql;
  const tx = ((strings: TemplateStringsArray, ...values: unknown[]) => ({
    statement: strings.join('?'),
    values,
  })) as unknown as NeonSql;
  const sqlWithTransaction = sql as unknown as {
    transaction: (callback: (tx: NeonSql) => unknown[]) => Promise<unknown[][]>;
  };
  sqlWithTransaction.transaction = async (callback: (tx: NeonSql) => unknown[]) => {
    const statements = callback(tx) as Array<{ statement: string; values: unknown[] }>;
    transactionCalls.push(...statements);
    if (statements.some((statement) => statement.statement.includes('api_quota_buckets'))) {
      const requested = JSON.parse(String(statements[1].values[0])) as Array<{
        subject_key: string;
        bucket_type: string;
        window_start: string;
        limit_count: number;
      }>;
      const locked = requested.map((row) => ({
        ...row,
        request_count: blockedBuckets.includes(row.bucket_type) ? row.limit_count : 0,
        reset_at: new Date(Date.now() + (row.bucket_type.endsWith('day') ? 60_000 : 10_000)).toISOString(),
      }));
      return [
        [{ id: userId }],
        [],
        locked,
        blockedBuckets.length > 0 ? [] : locked.map(({ bucket_type }) => ({ bucket_type })),
      ];
    }
    return statements.map(() => []);
  };
  return { sql, token: material.token, directCalls, transactionCalls };
}

describe('public API key authentication and management', () => {
  beforeEach(() => getNeonClient.mockReset());

  it('authenticates by token digest and scopes the context to the owning account', async () => {
    const material = createApiKeyMaterial();
    const sql = makeSql([{
      id: material.id,
      user_id: userId,
      key_hash: material.hash,
      permission: 'read_write',
      deletion_state: 'active',
    }]);
    getNeonClient.mockReturnValue(sql);

    const result = await authenticateApiKey(request(material.token), 'read');

    expect(isApiContext(result)).toBe(true);
    if (!isApiContext(result)) return;
    expect(result).toMatchObject({ userId, keyId: material.id, permission: 'read_write' });
    expect(sql.calls[0].values).toContain(material.id);
    expect(sql.calls[0].values).not.toContain(material.token);
  });

  it('denies write requests to read-only keys and blocks accounts being deleted', async () => {
    const material = createApiKeyMaterial();
    getNeonClient.mockReturnValue(makeSql([{
      id: material.id, user_id: userId, key_hash: material.hash, permission: 'read', deletion_state: 'active',
    }]));
    const permissionResponse = await authenticateApiKey(request(material.token), 'write');
    expect(permissionResponse).toBeInstanceOf(NextResponse);
    expect((permissionResponse as NextResponse).status).toBe(403);

    getNeonClient.mockReturnValue(makeSql([{
      id: material.id, user_id: userId, key_hash: material.hash, permission: 'read_write', deletion_state: 'pending',
    }]));
    const deletionResponse = await authenticateApiKey(request(material.token), 'read');
    expect((deletionResponse as NextResponse).status).toBe(410);
  });

  it('rejects missing, mismatched, and revoked keys without disclosing key existence', async () => {
    const material = createApiKeyMaterial();
    const sql = makeSql([]);
    getNeonClient.mockReturnValue(sql);
    const missingResponse = await authenticateApiKey(request('invalid'), 'read');
    expect((missingResponse as NextResponse).status).toBe(401);
    expect(sql.calls).toHaveLength(0);

    const mismatchSql = makeSql([{
      id: material.id, user_id: userId, key_hash: '0'.repeat(64), permission: 'read', deletion_state: 'active',
    }]);
    getNeonClient.mockReturnValue(mismatchSql);
    const mismatchResponse = await authenticateApiKey(request(material.token), 'read');
    expect((mismatchResponse as NextResponse).status).toBe(401);

    getNeonClient.mockReturnValue(makeSql([]));
    const revokedResponse = await authenticateApiKey(request(material.token), 'read');
    expect((revokedResponse as NextResponse).status).toBe(401);
    expect((mismatchResponse as NextResponse).headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('returns a new secret only at creation and scopes revocation to its owner', async () => {
    const calls: Array<{ statement: string; values: unknown[] }> = [];
    const tx = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const statement = strings.join('?');
      calls.push({ statement, values });
      return [];
    }) as unknown as NeonSql;
    const sql = (async () => []) as unknown as NeonSql;
    const sqlWithTransaction = sql as unknown as {
      transaction: (callback: (transaction: NeonSql) => unknown[]) => Promise<unknown[][]>;
    };
    sqlWithTransaction.transaction = async (callback: (transaction: NeonSql) => unknown[]) => {
      callback(tx);
      return [[{ id: userId, deletion_state: 'active' }], [{ id: '00000000-0000-4000-8000-000000000002', created_at: '2026-09-26T10:00:00Z' }]];
    };
    const context = { sql, userId, keyId: '', permission: 'read_write' as const };
    const created = await createApiKey(context, 'Automation', 'read_write');
    expect(created?.token).toMatch(/^lxd_v1_[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/);
    expect(calls[1].statement).toContain('key_prefix');
    expect(calls[1].values).toContain(created?.prefix);
    expect(calls[1].values).toContain(created ? sha256(created.token) : null);
    expect(calls.flatMap((call) => call.values)).not.toContain(created?.token);

    const ownerSql = makeSql([{ id: '00000000-0000-4000-8000-000000000003' }]);
    const revoked = await revokeApiKey({ ...context, sql: ownerSql }, '00000000-0000-4000-8000-000000000003');
    expect(revoked).toBe(true);
    expect(ownerSql.calls[0].values).toEqual(['00000000-0000-4000-8000-000000000003', userId]);
  });

  it('projects only non-secret API key metadata for the dashboard', async () => {
    const sql = makeSql([{
      id: '00000000-0000-4000-8000-000000000003',
      name: 'Automation',
      key_prefix: 'lxd_v1_00000000-0000-4000-8000-000000000003',
      permission: 'read',
      created_at: '2026-09-26T10:00:00Z',
      last_used_at: null,
      revoked_at: null,
      key_hash: 'sensitive-hash',
    }]);
    const keys = await listApiKeys({ sql, userId, keyId: '', permission: 'read_write' });
    expect(keys[0]).not.toHaveProperty('key_hash');
    expect(keys[0]).not.toHaveProperty('token');
    expect(keys[0]).toMatchObject({ name: 'Automation', permission: 'read' });
    expect(sql.calls[0].statement).not.toContain('key_hash');
    expect(sql.calls[0].values).toContain(userId);
  });

  it('enforces atomic account quotas and returns Retry-After on exhaustion', async () => {
    const exhausted = makeQuotaSql('read_write', ['read_minute', 'read_day']);
    getNeonClient.mockReturnValue(exhausted.sql);
    const handler = vi.fn(async () => apiResponse({ ok: true }));
    const limited = await runPublicApi(request(exhausted.token), '/api/v1/me', 'read', undefined, handler);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(50);
    expect(handler).not.toHaveBeenCalled();
    expect(exhausted.transactionCalls.some((call) => call.statement.includes('eligible'))).toBe(true);

    const allowed = makeQuotaSql('read_write');
    getNeonClient.mockReturnValue(allowed.sql);
    const written = await runPublicApi(request(allowed.token), '/api/v1/cards/base1-001', 'write', undefined, handler);
    expect(written.status).toBe(200);
    const requested = JSON.parse(String(allowed.transactionCalls[1].values[0])) as Array<{ bucket_type: string }>;
    expect(requested.map((row) => row.bucket_type)).toEqual(['write_minute', 'write_day']);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
