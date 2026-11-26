import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
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
    return { auth: { exchangeCodeForSession: mocks.exchangeCodeForSession, verifyOtp: mocks.verifyOtp, signOut: mocks.signOut } };
  },
}));

import { GET } from './route';

describe('Supabase Auth callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://lunidex-test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key');
    vi.stubEnv('SUPABASE_ALLOWED_USER_ID', '7d4d38a6-bc79-4fb7-b9f6-07e7f448a660');
    mocks.signOut.mockResolvedValue({ error: null });
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
      return {
        data: { user: {
          id: '7d4d38a6-bc79-4fb7-b9f6-07e7f448a660',
          email: 'owner@example.test',
          email_confirmed_at: '2026-11-26T10:00:00.000Z',
          user_metadata: {},
        } },
        error: null,
      };
    });

    const request = new NextRequest(
      'https://lunidex.app/fr/auth/callback?code=one-time-code&next=%2Ffr%2Fauth%2Freset-password%3Fmode%3Drecovery',
    );
    const response = await GET(request);

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('one-time-code');
    expect(mocks.setCookie).toHaveBeenCalledWith('sb-test-auth-token', 'session-cookie', { httpOnly: true, path: '/' });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://lunidex.app/fr/auth/reset-password?mode=recovery');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('clears a session exchanged for a different or unverified account', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { user: {
        id: 'e3dc9ee8-46bd-4e1c-9be5-6802e8c0ad37',
        email: 'other@example.test',
        email_confirmed_at: '2026-11-26T10:00:00.000Z',
        user_metadata: {},
      } },
      error: null,
    });

    const response = await GET(new NextRequest('https://lunidex.app/en/auth/callback?code=one-time-code'));

    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(response.headers.get('location')).toContain('auth=callback_error');
  });

  it('passes a recovery token hash to the exact locale reset page without verifying it in the GET route', async () => {
    const request = new NextRequest(
      'https://lunidex.app/fr/auth/callback?next=%2Fen%2Fdashboard&token_hash=opaque-recovery-hash&type=recovery',
    );

    const response = await GET(request);

    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.setCookie).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://lunidex.app/fr/auth/reset-password?mode=recovery&token_hash=opaque-recovery-hash',
    );
  });

  it('uses the canonical production origin for recovery redirects when Next exposes its internal listener URL', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = await GET(new NextRequest(
      'http://0.0.0.0:3000/fr/auth/callback?next=%2Fen%2Fdashboard&token_hash=opaque-recovery-hash&type=recovery',
    ));
    const location = response.headers.get('location') ?? '';

    expect(location).toBe(
      'https://lunidex.app/fr/auth/reset-password?mode=recovery&token_hash=opaque-recovery-hash',
    );
    expect(location).not.toContain('0.0.0.0');
    expect(location).not.toContain('next=');
    expect(location).not.toContain('code=');
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('uses the canonical production origin for code callbacks and never returns the code in Location', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { user: {
        id: '7d4d38a6-bc79-4fb7-b9f6-07e7f448a660',
        email: 'owner@example.test',
        email_confirmed_at: '2026-11-26T10:00:00.000Z',
        user_metadata: {},
      } },
      error: null,
    });

    const response = await GET(new NextRequest(
      'http://0.0.0.0:3000/en/auth/callback?code=one-time-code&next=%2Fen%2Fdashboard',
    ));
    const location = response.headers.get('location') ?? '';

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('one-time-code');
    expect(location).toBe('https://lunidex.app/en/dashboard');
    expect(location).not.toContain('0.0.0.0');
    expect(location).not.toContain('one-time-code');
    expect(location).not.toContain('code=');
    expect(location).not.toContain('next=');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('keeps localhost callback redirects on the local development origin', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const response = await GET(new NextRequest('http://localhost:3000/en/auth/callback?auth=callback_error'));

    expect(response.headers.get('location')).toBe('http://localhost:3000/en/dashboard?auth=callback_error');
  });

  it('uses a prefetch-safe recovery link built from the exact RedirectTo and TokenHash', async () => {
    const template = readFileSync(resolve(process.cwd(), 'supabase/templates/recovery.html'), 'utf8');
    const href = template.match(/href="([^"]+)"/)?.[1];
    expect(href).toContain('{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=recovery');
    expect(template).not.toContain('{{ .ConfirmationURL }}');

    const redirectTo = 'https://lunidex.app/fr/auth/callback?next=%2Ffr%2Fauth%2Freset-password%3Fmode%3Drecovery';
    const recoveryLink = new URL(href!
      .replace('{{ .RedirectTo }}', redirectTo)
      .replaceAll('&amp;', '&')
      .replace('{{ .TokenHash }}', 'synthetic-recovery-token-hash'));
    expect(recoveryLink.pathname).toBe('/fr/auth/callback');
    expect(recoveryLink.searchParams.get('next')).toBe('/fr/auth/reset-password?mode=recovery');
    expect(recoveryLink.searchParams.get('token_hash')).toBe('synthetic-recovery-token-hash');
    expect(recoveryLink.searchParams.get('type')).toBe('recovery');

    const response = await GET(new NextRequest(recoveryLink));
    expect(response.headers.get('location')).toBe(
      'https://lunidex.app/fr/auth/reset-password?mode=recovery&token_hash=synthetic-recovery-token-hash',
    );
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
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
