// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  user: null,
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
  resetPassword: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('@/lib/neon/AuthProvider', () => ({ useAuth: () => auth }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key }),
}));
vi.mock('@/lib/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/posthog-client', () => ({ capturePostHogEvent: vi.fn() }));
vi.mock('@/components/ui/LunidexLogo', () => ({ default: () => null }));
vi.mock('@/components/ui/button', () => ({
  Button: (props: ComponentProps<'button'>) => createElement('button', props),
}));
vi.mock('@/components/ui/input', () => ({
  Input: (props: ComponentProps<'input'>) => createElement('input', props),
}));

import AuthModal from './AuthModal';

describe('AuthModal with the real dialog primitive', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('keeps the dialog open when an autofill suggestion consumes Escape', async () => {
    const onOpenChange = vi.fn();
    await act(async () => root.render(createElement(AuthModal, { open: true, onOpenChange })));

    const password = document.querySelector<HTMLInputElement>('[role="dialog"] input[type="password"]');
    expect(password).not.toBeNull();

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    password?.addEventListener('keydown', (event) => event.preventDefault(), { once: true });
    await act(async () => {
      password?.dispatchEvent(escape);
    });

    expect(escape.defaultPrevented).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('still closes on an intentional backdrop click', async () => {
    const onOpenChange = vi.fn();
    await act(async () => root.render(createElement(AuthModal, { open: true, onOpenChange })));

    const backdrop = document.querySelector('[data-slot="dialog-overlay"]');
    expect(backdrop).not.toBeNull();
    await act(async () => {
      backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
