// @vitest-environment jsdom

import { act, createElement, type ComponentProps, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
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
  const container = ({ children, className, overlayClassName }: { children?: ReactNode; className?: string; overlayClassName?: string }) => createElement('div', {
    className,
    'data-overlay-class': overlayClassName ?? '',
  }, children);
  return {
    Dialog: ({
      open,
      onOpenChange,
      children,
    }: {
      open: boolean;
      onOpenChange?: (nextOpen: boolean, eventDetails: { reason: string; event: Event; cancel: () => void }) => void;
      children?: ReactNode;
    }) => open ? createElement('div', {
      role: 'dialog',
      onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
          onOpenChange?.(false, { reason: 'escape-key', event: event.nativeEvent, cancel: vi.fn() });
        }
      },
    }, children) : null,
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
  return { Input: (props: ComponentProps<'input'>) => createElement('input', props) };
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

  it('layers authentication above an open card detail modal', async () => {
    await act(async () => root.render(createElement(AuthModal, { open: true, onOpenChange: vi.fn() })));

    const content = container.querySelector<HTMLElement>('[data-overlay-class]');
    expect(content?.className).toContain('z-[402]');
    expect(content?.dataset.overlayClass).toBe('z-[401]');
  });

  it('names empty signup fields without showing sample values as entered data', async () => {
    await act(async () => root.render(createElement(AuthModal, { open: true, initialMode: 'signup', onOpenChange: vi.fn() })));

    const name = container.querySelector<HTMLInputElement>('input[autocomplete="name"]');
    const email = container.querySelector<HTMLInputElement>('input[autocomplete="email"]');
    const password = container.querySelector<HTMLInputElement>('input[autocomplete="new-password"]');

    expect(name?.name).toBe('name');
    expect(email?.name).toBe('email');
    expect(password?.name).toBe('password');
    expect([name?.placeholder, email?.placeholder, password?.placeholder]).toEqual(['', '', '']);
  });

  it('keeps the modal open when a password suggestion consumes Escape', async () => {
    const onOpenChange = vi.fn();
    await act(async () => root.render(createElement(AuthModal, { open: true, onOpenChange })));

    const password = container.querySelector<HTMLInputElement>('input[type="password"]');
    expect(password).not.toBeNull();
    password?.addEventListener('keydown', (event) => event.preventDefault(), { once: true });
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    await act(async () => {
      password?.dispatchEvent(escape);
    });

    expect(escape.defaultPrevented).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('still closes on an unhandled Escape key', async () => {
    const onOpenChange = vi.fn();
    await act(async () => root.render(createElement(AuthModal, { open: true, onOpenChange })));

    const password = container.querySelector<HTMLInputElement>('input[type="password"]');
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => {
      password?.dispatchEvent(escape);
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the modal open when the browser autofills the form fields', async () => {
    const onOpenChange = vi.fn();
    await act(async () => root.render(createElement(AuthModal, { open: true, onOpenChange })));

    const email = container.querySelector<HTMLInputElement>('input[type="email"]');
    const password = container.querySelector<HTMLInputElement>('input[type="password"]');
    const setInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setInputValue?.call(email, 'qa@lunidex.invalid');
      email?.dispatchEvent(new Event('input', { bubbles: true }));
      setInputValue?.call(password, 'synthetic-only-password');
      password?.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
