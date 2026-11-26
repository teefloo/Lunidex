import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('@neondatabase/auth/next/server', () => ({
  createNeonAuth: vi.fn(() => ({
    handler: () => ({ POST: mocks.post }),
  })),
}));

import {
  extractNeonAuthSessionToken,
  revokeNeonAuthSession,
} from './server-auth';

function makeRequest(cookie: string): Request {
  return new Request('https://lunidex.app/api/auth/sign-out', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Cookie: cookie,
      Origin: 'https://lunidex.app',
    },
  });
}

describe('Neon Auth session revocation', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEON_AUTH_BASE_URL', 'https://auth.example.test');
    vi.stubEnv('NEON_AUTH_COOKIE_SECRET', 'a'.repeat(32));
    mocks.post.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('extracts the secure session token and decodes cookie encoding', () => {
    expect(extractNeonAuthSessionToken(
      'other=value; __Secure-neon-auth.session_token=session%2Dtoken; __Secure-neon-auth.session_data=stale',
    )).toBe('session-token');
  });

  it('supports the development cookie only in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(extractNeonAuthSessionToken('lunidex-neon-auth.session_token=dev-token')).toBe('dev-token');
    vi.stubEnv('NODE_ENV', 'test');
    expect(extractNeonAuthSessionToken('lunidex-neon-auth.session_token=dev-token')).toBeNull();
  });

  it('calls the upstream revoke-session endpoint with the exact token', async () => {
    mocks.post.mockResolvedValue(new Response(JSON.stringify({ status: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const result = await revokeNeonAuthSession(makeRequest(
      '__Secure-neon-auth.session_token=session-token; __Secure-neon-auth.session_data=stale',
    ));

    expect(result).toEqual({ attempted: true, success: true });
    expect(mocks.post).toHaveBeenCalledOnce();
    const [request, context] = mocks.post.mock.calls[0] as [Request, { params: Promise<unknown> }];
    expect(await request.json()).toEqual({ token: 'session-token' });
    expect(request.headers.get('cookie')).toContain('__Secure-neon-auth.session_token=session-token');
    expect(await context.params).toEqual({ path: ['revoke-session'] });
  });

  it('reports upstream failures without treating logout as revoked', async () => {
    mocks.post.mockResolvedValue(new Response(JSON.stringify({ error: 'upstream failure' }), { status: 503 }));

    await expect(revokeNeonAuthSession(makeRequest(
      '__Secure-neon-auth.session_token=session-token',
    ))).resolves.toEqual({ attempted: true, success: false });
  });

  it('does not call Neon Auth when no session token is present', async () => {
    await expect(revokeNeonAuthSession(makeRequest('__Secure-neon-auth.session_data=stale')))
      .resolves.toEqual({ attempted: false, success: true });
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
