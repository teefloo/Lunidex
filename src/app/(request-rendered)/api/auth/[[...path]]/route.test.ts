import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authPost: vi.fn(),
  revoke: vi.fn(),
  flushSentryEvents: vi.fn().mockResolvedValue(undefined),
  reportHttpFailure: vi.fn(),
  reportSentryException: vi.fn(),
}));

vi.mock('@/lib/neon/server-auth', () => ({
  getNeonAuthServer: vi.fn(() => ({
    handler: () => ({ POST: mocks.authPost }),
  })),
  revokeNeonAuthSession: mocks.revoke,
}));

vi.mock('@/lib/sentry-observability', () => ({
  flushSentryEvents: mocks.flushSentryEvents,
  reportHttpFailure: mocks.reportHttpFailure,
  reportSentryException: mocks.reportSentryException,
}));

import { POST } from './route';

function makeRequest(): Request {
  return new Request('https://lunidex.app/api/auth/sign-out', {
    method: 'POST',
    headers: {
      Cookie: '__Secure-neon-auth.session_token=session-token',
      Origin: 'https://lunidex.app',
    },
  });
}

describe('auth sign-out route', () => {
  it('revokes before clearing cookies and refuses a false success', async () => {
    mocks.revoke.mockResolvedValue({ attempted: true, success: false });
    mocks.authPost.mockResolvedValue(new Response(JSON.stringify({ status: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': '__Secure-neon-auth.session_token=; Max-Age=0; Path=/',
      },
    }));

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ path: ['sign-out'] }),
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Unable to complete sign-out.' });
    expect(response.headers.getSetCookie()).toContain('__Secure-neon-auth.session_token=; Max-Age=0; Path=/');
    expect(mocks.revoke.mock.invocationCallOrder[0]).toBeLessThan(mocks.authPost.mock.invocationCallOrder[0]);
  });

  it('keeps a successful sign-out response after confirmed revocation', async () => {
    mocks.revoke.mockResolvedValue({ attempted: true, success: true });
    mocks.authPost.mockResolvedValue(new Response(JSON.stringify({ status: true }), { status: 200 }));

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ path: ['sign-out'] }),
    });

    expect(response.status).toBe(200);
  });
});
