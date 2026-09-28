import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

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

import { DELETE } from './route';

describe('API key revoke route', () => {
  it('returns a structured error when revocation has an untrusted origin', async () => {
    const request = new NextRequest('https://lunidex.app/api/account/api-keys/00000000-0000-4000-8000-000000000001', {
      method: 'DELETE',
      headers: { Origin: 'https://attacker.test' },
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }),
    });

    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVALID_REQUEST_ORIGIN' },
    });
    expect(mocks.getUserSessionContext).not.toHaveBeenCalled();
  });
});
