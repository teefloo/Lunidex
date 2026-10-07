// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as null | { id: string; email: string; user_metadata: { name?: string; display_name?: string } },
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    resetPassword: vi.fn().mockResolvedValue({ error: null }),
  },
}));

vi.mock('@/lib/neon/AuthProvider', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key }),
}));
vi.mock('@/lib/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/posthog-client', () => ({ capturePostHogEvent: vi.fn() }));
vi.mock('@/components/ui/LunidexLogo', () => ({ default: () => null }));

vi.mock('@/components/ui/dialog', async () => {
  const { createElement } = await import('react');
  const container = ({ children }: { children?: ReactNode }) => createElement('div', null, children);
  return {
    Dialog: ({ open, children }: { open: boolean; children?: ReactNode }) => (
      open ? createElement('div', { role: 'dialog' }, children) : null
    ),
    DialogContent: container,
    DialogDescription: container,
    DialogHeader: container,
    DialogTitle: container,
  };
});

vi.mock('@/components/ui/button', async () => {
  const { createElement } = await import('react');
  return { Button: ({ children }: { children?: ReactNode }) => createElement('button', null, children) };
});

vi.mock('@/components/ui/input', async () => {
  const { createElement } = await import('react');
  return { Input: () => createElement('input') };
});

import AuthModal from './AuthModal';

describe('AuthModal', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    mocks.auth.user = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('closes an open sign-in dialog when the session becomes authenticated', async () => {
    const onOpenChange = vi.fn();
    const renderModal = () => root.render(createElement(AuthModal, { open: true, onOpenChange }));

    await act(async () => renderModal());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();

    mocks.auth.user = {
      id: 'user-1',
      email: 'trainer@example.test',
      user_metadata: {},
    };
    await act(async () => renderModal());

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
  it('opens the existing form in signup mode when requested by the demo', async () => {
    await act(async () => root.render(createElement(AuthModal, { open: true, initialMode: 'signup', onOpenChange: vi.fn() })));
    expect(container.textContent).toContain('Create your account');
    expect(container.textContent).toContain('Name');
  });
});
