import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  setCookie: vi.fn(),
  cookieOptions: null as unknown,
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    set: mocks.setCookie,
  }),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: unknown }) => {
    mocks.cookieOptions = options.cookies;
    return { auth: { exchangeCodeForSession: mocks.exchangeCodeForSession } };
  },
}));

import { GET } from './route';

describe('Supabase Auth callback', () => {
  it('exchanges a one-time recovery code before redirecting to the locale recovery page', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://lunidex-test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key');
    mocks.exchangeCodeForSession.mockImplementation(async () => {
      const adapter = mocks.cookieOptions as {
        setAll: (cookies: Array<{ name: string; value: string; options: Record<string, unknown> }>) => void;
      };
      adapter.setAll([{ name: 'sb-test-auth-token', value: 'session-cookie', options: { httpOnly: true, path: '/' } }]);
      return { error: null };
    });

    const request = new NextRequest(
      'https://lunidex.app/fr/auth/callback?code=one-time-code&next=%2Ffr%2Fauth%2Freset-password%3Fmode%3Drecovery',
    );
    const response = await GET(request);

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('one-time-code');
    expect(mocks.setCookie).toHaveBeenCalledWith('sb-test-auth-token', 'session-cookie', { httpOnly: true, path: '/' });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://lunidex.app/fr/auth/reset-password?mode=recovery');
  });
});
