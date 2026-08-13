import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const authState = vi.hoisted(() => ({ enabled: true, loading: false, user: null }));

vi.mock('@/lib/neon/AuthProvider', () => ({
  useAuth: () => authState,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

import { AuthModalBoundary } from './AuthModalBoundary';

function BrokenAuthModal(): ReactNode {
  throw new Error('auth chunk unavailable');
}

describe('AuthModalBoundary', () => {
  it('keeps the current page usable when the lazy auth modal fails', () => {
    render(
      <AuthModalBoundary onClose={vi.fn()}>
        <BrokenAuthModal />
      </AuthModalBoundary>,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
