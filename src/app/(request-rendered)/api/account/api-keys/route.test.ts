import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { NeonSql } from '@/lib/neon/server';

const mocks = vi.hoisted(() => ({ getUserSessionContext: vi.fn() }));

vi.mock('@/lib/api/observed-route', () => ({
  withObservedRouteHandler: (_route: string, _feature: string, handler: (...args: never[]) => unknown) => handler,
}));

vi.mock('@/lib/public-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/public-api')>();
  return {
    ...actual,
    getUserSessionContext: mocks.getUserSessionContext,
  };
});

import { GET, POST } from './route';

describe('API key list route', () => {
  beforeEach(() => mocks.getUserSessionContext.mockReset());

  it('returns a structured error when key creation has an untrusted origin', async () => {
    const request = new NextRequest('https://lunidex.app/api/account/api-keys', {
      method: 'POST',
      headers: {
        Origin: 'https://attacker.test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Audit test', permission: 'read' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVALID_REQUEST_ORIGIN' },
    });
    expect(mocks.getUserSessionContext).not.toHaveBeenCalled();
  });

  it('returns a structured unavailable response when the key list cannot load', async () => {
    const sql = (async () => {
      throw new Error('database unavailable');
    }) as unknown as NeonSql;
    mocks.getUserSessionContext.mockResolvedValue({
      sql,
      userId: '00000000-0000-4000-8000-000000000001',
      keyId: '',
      permission: 'read_write',
    });

    const response = await GET(new NextRequest('https://lunidex.app/api/account/api-keys'));

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'API_UNAVAILABLE' } });
  });
});
