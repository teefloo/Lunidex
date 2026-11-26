import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://lunidex-test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exchanges a one-time recovery code before redirecting to the locale recovery page', async () => {
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

  it('passes a recovery token hash to the exact locale reset page without verifying it in the GET route', async () => {
    const request = new NextRequest(
      'https://lunidex.app/fr/auth/callback?next=%2Fen%2Fdashboard&token_hash=opaque-recovery-hash&type=recovery',
    );

    const response = await GET(request);

    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.setCookie).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://lunidex.app/fr/auth/reset-password?mode=recovery&token_hash=opaque-recovery-hash',
    );
  });

  it('uses the English reset route when a recovery callback arrives unlocalized', async () => {
    const request = new NextRequest(
      'https://lunidex.app/auth/callback?token_hash=opaque-recovery-hash&type=recovery',
    );

    const response = await GET(request);

    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe(
      'https://lunidex.app/en/auth/reset-password?mode=recovery&token_hash=opaque-recovery-hash',
    );
  });

  it('does not forward a token hash with any type other than recovery', async () => {
    const request = new NextRequest(
      'https://lunidex.app/fr/auth/callback?next=%2Ffr%2Fauth%2Freset-password%3Fmode%3Drecovery&token_hash=opaque-token&type=signup',
    );

    const response = await GET(request);
    const location = response.headers.get('location') ?? '';

    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(location).toBe('https://lunidex.app/fr/auth/reset-password?mode=recovery&auth=callback_error');
    expect(location).not.toContain('opaque-token');
  });

  it('routes an expired recovery callback to the invalid-link state without forwarding the token hash', async () => {
    const request = new NextRequest(
      'https://lunidex.app/fr/auth/callback?next=%2Fen%2Fdashboard&token_hash=expired-token&type=recovery&error_code=otp_expired',
    );

    const response = await GET(request);
    const location = response.headers.get('location') ?? '';

    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(location).toBe('https://lunidex.app/fr/auth/reset-password?mode=recovery&auth=callback_error');
    expect(location).not.toContain('expired-token');
  });
});
