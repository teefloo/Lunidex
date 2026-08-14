import { render, screen, waitFor } from '@testing-library/react';
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
});
