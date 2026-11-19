import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ sql: vi.fn(), getClient: vi.fn(), rateLimit: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/neon/server', () => ({ getNeonClient: mocks.getClient }));
vi.mock('@/lib/neon/auth', () => ({ getNeonUserFromRequest: mocks.getUser, ensureNeonUser: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mocks.rateLimit }));
vi.mock('@/lib/api/observed-route', () => ({ withObservedRouteHandler: (_route: string, _feature: string, handler: unknown) => handler }));
import { GET, PUT } from './route';

describe('simulated Neon snapshot reads', () => {
  const request = (path = '/api/user-state') => new NextRequest(`http://localhost:3106${path}`);
  const putRequest = (payload: unknown, contentLength?: string) => new NextRequest('http://localhost:3106/api/user-state', {
    method: 'PUT',
    headers: {
      Origin: 'http://localhost:3106',
      'Content-Type': 'application/json',
      ...(contentLength ? { 'Content-Length': contentLength } : {}),
    },
    body: JSON.stringify(payload),
  });
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getClient.mockReturnValue(mocks.sql);
    mocks.getUser.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000001' });
    mocks.rateLimit.mockReturnValue(true);
  });
  it('degrades without configuration before attempting a query', async () => {
    mocks.getClient.mockReturnValue(null);
    expect((await GET(request())).status).toBe(503);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
  it('keeps a slow read private and binds it to the authenticated owner', async () => {
    let resolveRows!: (rows: unknown[]) => void;
    mocks.sql.mockReturnValue(new Promise<unknown[]>(resolve => { resolveRows = resolve; }));
    const pending = GET(request());
    await vi.waitFor(() => expect(mocks.sql).toHaveBeenCalledTimes(1));
    resolveRows([{ data: { team: [25] }, updated_at: '2026-10-03T00:00:00Z' }]);
    const response = await pending;
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.sql.mock.calls[0].slice(1)).toEqual(['00000000-0000-4000-8000-000000000001']);
    await expect(response.json()).resolves.toMatchObject({ data: { team: [25] } });
  });
  it('returns unavailable for a database connection failure', async () => {
    mocks.sql.mockRejectedValue(Object.assign(new Error('Simulated outage'), { name: 'NeonDbError', code: '08006' }));
    expect((await GET(request())).status).toBe(503);
  });
  it('returns a private rate-limit response before querying', async () => {
    mocks.rateLimit.mockReturnValue(false);
    const response = await GET(request());
    expect(response.status).toBe(429);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it('returns 401 for writes without a session and never trusts a client user id', async () => {
    mocks.getUser.mockResolvedValue(null);
    const response = await PUT(putRequest({ userId: '00000000-0000-4000-8000-000000000099', data: { team: [25] } }));
    expect(response.status).toBe(401);
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it('returns 409 with only the authenticated account snapshot after a stale write', async () => {
    mocks.sql.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const statement = strings.join(' ');
      if (statement.includes('update public.user_state')) return [];
      if (statement.includes('select data, updated_at::text as updated_at')) {
        expect(values).toContain('00000000-0000-4000-8000-000000000001');
        return [{ data: { team: [6] }, updated_at: '2026-10-19T11:00:00.000Z' }];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const response = await PUT(putRequest({ data: { team: [25] }, expectedUpdatedAt: '2026-10-19T10:00:00.000Z' }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ conflict: true, data: { team: [6] } });
  });

  it('returns 413 when a user-state document exceeds the existing two-megabyte ceiling', async () => {
    const response = await PUT(putRequest({ data: { note: 'oversized' } }, '2000001'));
    expect(response.status).toBe(413);
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it('returns 503 for a database failure during a state write', async () => {
    mocks.sql.mockRejectedValue(Object.assign(new Error('Simulated outage'), { name: 'NeonDbError', code: '08006' }));
    const response = await PUT(putRequest({ data: { team: [25] }, expectedUpdatedAt: null }));
    expect(response.status).toBe(503);
  });

  it('returns each account’s private snapshot based only on the authenticated session', async () => {
    mocks.sql.mockImplementation(async (_strings: TemplateStringsArray, ...values: unknown[]) => {
      const accountId = values[0];
      return [{ data: { team: [accountId === '00000000-0000-4000-8000-000000000002' ? 6 : 25] }, updated_at: '2026-10-19T10:00:00.000Z' }];
    });
    mocks.getUser.mockResolvedValueOnce({ id: '00000000-0000-4000-8000-000000000001' });
    const first = await GET(request('/api/user-state?userId=00000000-0000-4000-8000-000000000002'));
    mocks.getUser.mockResolvedValueOnce({ id: '00000000-0000-4000-8000-000000000002' });
    const second = await GET(request('/api/user-state?userId=00000000-0000-4000-8000-000000000001'));
    await expect(first.json()).resolves.toMatchObject({ data: { team: [25] } });
    await expect(second.json()).resolves.toMatchObject({ data: { team: [6] } });
  });
});
