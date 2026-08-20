import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetNeonAuthServer = vi.hoisted(() => vi.fn());
const mockAuthGet = vi.hoisted(() => vi.fn());

vi.mock('@/lib/neon/server-auth', () => ({
  getNeonAuthServer: mockGetNeonAuthServer,
}));

import { GET } from './route';

describe('GET /api/auth/get-session', () => {
  beforeEach(() => {
    mockAuthGet.mockReset().mockResolvedValue(new Response(JSON.stringify({ session: null }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    mockGetNeonAuthServer.mockReset().mockReturnValue({
      handler: () => ({ GET: mockAuthGet }),
    });
  });

  it('forces upstream session validation instead of trusting the signed cache cookie', async () => {
    const request = new Request('https://lunidex.test/api/auth/get-session', {
      headers: { cookie: '__Secure-neon-auth.session_token=old-token; neon-auth.session_data=old-cache' },
    });

    const response = await GET(request, { params: Promise.resolve({ path: ['get-session'] }) });

    expect(response.status).toBe(200);
    const proxiedRequest = mockAuthGet.mock.calls[0]?.[0] as Request;
    expect(new URL(proxiedRequest.url).searchParams.get('disableCookieCache')).toBe('true');
    expect(proxiedRequest.headers.get('cookie')).toContain('old-token');
  });
});
