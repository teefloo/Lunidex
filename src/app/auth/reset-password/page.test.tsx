import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPasswordPage from './page';

const authMock = vi.hoisted(() => ({
  updatePassword: vi.fn(),
}));

vi.mock('@/lib/neon/AuthProvider', () => ({
  useAuth: () => ({ loading: false, updatePassword: authMock.updatePassword }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (_key: string, values?: { defaultValue?: string }) => values?.defaultValue ?? '' }),
}));

vi.mock('@/hooks/useLocaleHref', () => ({
  useLocaleHref: () => (path: string) => path,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    authMock.updatePassword.mockReset();
    window.history.replaceState({}, '', '/en/auth/reset-password?token=reset-token');
  });

  it('renders the password form from a reset token without an existing session', async () => {
    render(<ResetPasswordPage />);

    await waitFor(() => expect(screen.getByLabelText('New password')).toBeInTheDocument());
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('passes the captured token after removing it from the URL', async () => {
    authMock.updatePassword.mockResolvedValue({ error: null });
    render(<ResetPasswordPage />);

    await waitFor(() => expect(screen.getByLabelText('New password')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'new-password' } });
    fireEvent.submit(screen.getByLabelText('New password').closest('form')!);

    await waitFor(() => expect(authMock.updatePassword).toHaveBeenCalledWith('new-password', 'reset-token'));
  });

  it('shows the invalid-link state when no reset token is present', async () => {
    window.history.replaceState({}, '', '/en/auth/reset-password');
    render(<ResetPasswordPage />);

    await waitFor(() => expect(screen.getByText('This reset link is invalid or has expired. Please request a new one.')).toBeInTheDocument());
  });
});
