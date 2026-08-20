import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetNeonAuthServer = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());
const mockCookies = vi.hoisted(() => vi.fn());

vi.mock('./server-auth', () => ({
  getNeonAuthServer: mockGetNeonAuthServer,
}));

vi.mock('next/headers', () => ({
  cookies: mockCookies,
}));

import { getNeonUserFromRequest, getServerAuthUser } from './auth';

describe('Neon server session lookups', () => {
  beforeEach(() => {
    mockGetSession.mockReset().mockResolvedValue({
      data: {
        user: {
          id: '72aaab1d-ae20-4ee0-9c60-cf8e8580f534',
          email: 'ash@example.test',
          name: 'Ash',
        },
      },
    });
    mockGetNeonAuthServer.mockReset().mockReturnValue({ getSession: mockGetSession });
    mockCookies.mockReset().mockResolvedValue({
      has: vi.fn().mockReturnValue(true),
      getAll: vi.fn().mockReturnValue([
        { name: '__Secure-neon-auth.session_token', value: 'session-token' },
      ]),
    });
    vi.stubEnv('NEON_AUTH_BASE_URL', 'https://auth.example.test/api');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      user: {
        id: '72aaab1d-ae20-4ee0-9c60-cf8e8580f534',
        email: 'ash@example.test',
        name: 'Ash',
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('bypasses the signed session-data cache for authorization lookups', async () => {
    const user = await getNeonUserFromRequest(new Request('https://lunidex.test/api/user-state'));

    expect(user?.id).toBe('72aaab1d-ae20-4ee0-9c60-cf8e8580f534');
    expect(mockGetSession).toHaveBeenCalledWith({ query: { disableCookieCache: true } });
  });

  it('does not authorize when the fresh Neon Auth lookup has no user', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { user: null } });

    const user = await getNeonUserFromRequest(new Request('https://lunidex.test/api/user-state'));

    expect(user).toBeNull();
  });

  it('bypasses the signed session-data cache for server-rendered identity', async () => {
    const user = await getServerAuthUser();
    const fetchMock = vi.mocked(fetch);
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(user?.id).toBe('72aaab1d-ae20-4ee0-9c60-cf8e8580f534');
    expect(requestUrl.searchParams.get('disableCookieCache')).toBe('true');
  });
});
