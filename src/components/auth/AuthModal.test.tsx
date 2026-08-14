import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthModal from './AuthModal';

const authMocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('@/lib/neon/AuthProvider', () => ({
  useAuth: () => authMocks,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  }),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AuthModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.signIn.mockResolvedValue({
      error: { name: 'AuthError', message: 'Invalid email or password' },
    });
  });

  it('keeps the error visible when sign-in is rejected', async () => {
    render(<AuthModal open onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'probe@example.invalid' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'not-a-real-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password');
    });
  });
});
