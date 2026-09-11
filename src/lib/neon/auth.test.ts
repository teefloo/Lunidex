import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getNeonUserFromRequest } from './auth';

describe('Neon Auth request session validation', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEON_AUTH_BASE_URL', 'https://auth.example.test');
    vi.spyOn(globalThis, 'fetch').mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('revalidates the exact session cookie without trusting session-data cache', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue(Response.json({
      user: { id: 'user-1', email: 'user@example.test', name: 'Test User' },
    }));

    const user = await getNeonUserFromRequest(new Request('https://lunidex.app/api/profile', {
      headers: {
        Cookie: '__Secure-neon-auth.session_token=session-token; __Secure-neon-auth.session_data=stale',
      },
    }));

    expect(user).toEqual({
      id: 'user-1',
      email: 'user@example.test',
      user_metadata: { name: 'Test User', display_name: 'Test User' },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string | URL, RequestInit | undefined];
    expect(url.toString()).toBe('https://auth.example.test/get-session?disableCookieCache=true');
    expect(new Headers(init?.headers).get('cookie')).toContain(
      '__Secure-neon-auth.session_token=session-token',
    );
  });

  it('does not contact Neon Auth when no session token is present', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    await expect(getNeonUserFromRequest(new Request('https://lunidex.app/api/profile', {
      headers: { Cookie: '__Secure-neon-auth.session_data=stale' },
    }))).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
