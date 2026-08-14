import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

const authClient = vi.hoisted(() => ({
  getSession: vi.fn(async () => ({ data: { session: null } })),
  signUp: { email: vi.fn() },
  signIn: { email: vi.fn(), social: vi.fn() },
  signOut: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  token: vi.fn(),
}));

vi.mock('./client', () => ({
  isNeonAuthConfigured: true,
  getNeonAuthClient: () => authClient,
  loadNeonAuthClient: async () => authClient,
}));

import { AuthProvider, useAuth } from './AuthProvider';

function AuthStateProbe() {
  const { loading, user } = useAuth();
  return <output data-testid="auth-state">{loading ? 'loading' : user ? 'signed-in' : 'signed-out'}</output>;
}

function AuthActionProbe() {
  const { signIn } = useAuth();
  const [message, setMessage] = useState('');
  return (
    <>
      <button type="button" onClick={async () => setMessage((await signIn('trainer@example.com', 'password')).error?.message ?? 'ok')}>
        Sign in
      </button>
      <output data-testid="auth-action-result">{message}</output>
    </>
  );
}

describe('AuthProvider runtime compatibility', () => {
  it('does not require the optional useSession method from the SDK client', async () => {
    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('signed-out'));
    expect(authClient.getSession).toHaveBeenCalledTimes(1);
  });

  it('falls back to the local auth proxy when the SDK omits nested sign-in actions', async () => {
    const sdkSignIn = authClient.signIn;
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid email or password' }),
    }));
    Object.assign(authClient, { signIn: undefined });
    vi.stubGlobal('fetch', fetchMock);

    try {
      render(
        <AuthProvider>
          <AuthActionProbe />
        </AuthProvider>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
      await waitFor(() => expect(screen.getByTestId('auth-action-result')).toHaveTextContent('Invalid email or password'));
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/sign-in/email', expect.objectContaining({ method: 'POST' }));
    } finally {
      Object.assign(authClient, { signIn: sdkSignIn });
      vi.unstubAllGlobals();
    }
  });

  it('does not report success when the sign-in response cannot be confirmed as a session', async () => {
    const sdkSignIn = authClient.signIn;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: 'user-1', email: 'trainer@example.com' } }),
    }));
    Object.assign(authClient, { signIn: undefined });
    vi.stubGlobal('fetch', fetchMock);

    try {
      render(
        <AuthProvider>
          <AuthActionProbe />
        </AuthProvider>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
      await waitFor(() => expect(screen.getByTestId('auth-action-result')).toHaveTextContent(
        'The sign-in session could not be confirmed.',
      ));
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/sign-in/email', expect.objectContaining({ method: 'POST' }));
    } finally {
      Object.assign(authClient, { signIn: sdkSignIn });
      vi.unstubAllGlobals();
    }
  });
});
