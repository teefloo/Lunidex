import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ sql: vi.fn(), getClient: vi.fn(), rateLimit: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/neon/server', () => ({ getNeonClient: mocks.getClient }));
vi.mock('@/lib/neon/auth', () => ({ getNeonUserFromRequest: mocks.getUser, ensureNeonUser: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mocks.rateLimit }));
vi.mock('@/lib/api/observed-route', () => ({ withObservedRouteHandler: (_route: string, _feature: string, handler: unknown) => handler }));
import { GET } from './route';

describe('simulated Neon snapshot reads', () => {
  const request = () => new NextRequest('http://localhost:3106/api/user-state');
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
});
