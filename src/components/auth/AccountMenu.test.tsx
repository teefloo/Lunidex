import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const authState = vi.hoisted(() => ({
  enabled: false,
  loading: false,
  user: null as { email: string; user_metadata: { name?: string } } | null,
}));

vi.mock('@/lib/neon/AuthProvider', () => ({
  useAuth: () => authState,
}));

vi.mock('@/hooks/useLocaleHref', () => ({
  useLocaleHref: () => (path: string) => `/fr${path}`,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => ({
      'dashboard.title': 'Tableau de bord',
    }[key] ?? options?.defaultValue ?? key),
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import AccountMenu from './AccountMenu';

describe('AccountMenu', () => {
  afterEach(() => {
    authState.enabled = false;
    authState.user = null;
  });

  it('keeps the local dashboard accessible when cloud auth is unavailable', () => {
    render(<AccountMenu />);

    expect(screen.getByRole('link', { name: 'Tableau de bord' })).toHaveAttribute('href', '/fr/dashboard');
  });

  it('shows the account name when rendered inside the mobile sheet', () => {
    authState.enabled = true;
    authState.user = {
      email: 'esteban@example.com',
      user_metadata: { name: 'Esteban' },
    };

    render(<AccountMenu showLabel />);

    expect(screen.getByText('Esteban')).toBeInTheDocument();
  });
});
