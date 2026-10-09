// @vitest-environment jsdom

import { act, createElement, useState, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cachedClient: null as object | null,
  loadClient: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('@/lib/neon/client', () => ({
  isNeonAuthConfigured: true,
  getNeonAuthClient: () => mocks.cachedClient,
  loadNeonAuthClient: mocks.loadClient,
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key }),
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

import { AuthProvider } from '@/lib/neon/AuthProvider';
import AuthModal from './AuthModal';

function ModalOwner({ initialMode }: { initialMode: 'signin' | 'signup' }) {
  const [open, setOpen] = useState(false);
  return createElement('div', null,
    createElement('button', { onClick: () => setOpen(true) }, 'Open auth'),
    open ? createElement(AuthModal, { open, onOpenChange: setOpen, initialMode }) : null,
  );
}

function fillAutofillField(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('AuthModal during lazy SDK loading', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    mocks.cachedClient = null;
    const client = {
      signIn: { email: mocks.signIn },
      signUp: { email: mocks.signUp },
      requestPasswordReset: mocks.resetPassword,
    };
    mocks.loadClient.mockImplementation(async () => {
      mocks.cachedClient = client;
      return client;
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => null }));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it.each(['signin', 'signup'] as const)('keeps the %s form mounted until the first SDK request finishes', async (initialMode) => {
    let finishRequest!: (result: { error: { message: string } }) => void;
    const request = new Promise<{ error: { message: string } }>((resolve) => { finishRequest = resolve; });
    const authAction = initialMode === 'signin' ? mocks.signIn : mocks.signUp;
    authAction.mockReturnValue(request);
    await act(async () => root.render(createElement(AuthProvider, null, createElement(ModalOwner, { initialMode }))));
    await act(async () => container.querySelector('button')?.click());

    const dialog = document.querySelector('[role="dialog"]');
    const email = dialog?.querySelector<HTMLInputElement>('input[type="email"]');
    const password = dialog?.querySelector<HTMLInputElement>('input[type="password"]');
    expect(email).toBeTruthy();
    expect(password).toBeTruthy();
    await act(async () => {
      fillAutofillField(email!, 'qa@lunidex.invalid');
      fillAutofillField(password!, 'synthetic-only-password');
      const name = dialog?.querySelector<HTMLInputElement>('input[autocomplete="name"]');
      if (name) fillAutofillField(name, 'QA trainer');
    });
    await act(async () => {
      dialog?.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Loading the SDK must not remount the owner and reset its open/form state.
    const dialogWhilePending = document.querySelector('[role="dialog"]');
    await act(async () => finishRequest({ error: { message: 'Synthetic test rejection' } }));
    expect(dialogWhilePending).toBe(dialog);
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(email?.value).toBe('qa@lunidex.invalid');
    expect(password?.value).toBe('synthetic-only-password');
    expect(dialog?.querySelector('[role="alert"]')?.textContent).toBe('Synthetic test rejection');
    expect(authAction).toHaveBeenCalledWith(expect.objectContaining({
      email: 'qa@lunidex.invalid', password: 'synthetic-only-password',
    }));
  });

  it('keeps the form open after the first password reset loads the SDK', async () => {
    mocks.resetPassword.mockResolvedValue({ error: null });
    await act(async () => root.render(createElement(AuthProvider, null, createElement(ModalOwner, { initialMode: 'signin' }))));
    await act(async () => container.querySelector('button')?.click());
    const dialog = document.querySelector('[role="dialog"]');
    const email = dialog?.querySelector<HTMLInputElement>('input[type="email"]');
    await act(async () => fillAutofillField(email!, 'qa@lunidex.invalid'));
    const reset = Array.from(dialog?.querySelectorAll('button') ?? []).find(button => button.textContent === 'Forgot password?');
    await act(async () => reset?.click());
    expect(mocks.resetPassword).toHaveBeenCalledWith(expect.objectContaining({ email: 'qa@lunidex.invalid' }));
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(email?.value).toBe('qa@lunidex.invalid');
  });

  it.each(['signin', 'signup'] as const)('still closes after a successful first %s request', async (initialMode) => {
    const authAction = initialMode === 'signin' ? mocks.signIn : mocks.signUp;
    authAction.mockResolvedValue({ error: null });
    if (initialMode === 'signin') {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => null })
        .mockResolvedValue({ ok: true, status: 200, json: async () => ({
          session: { expiresAt: '2027-01-01T00:00:00.000Z' },
          user: { id: 'qa-user', email: 'qa@lunidex.invalid', name: 'QA trainer' },
        }) }));
    }
    await act(async () => root.render(createElement(AuthProvider, null, createElement(ModalOwner, { initialMode }))));
    await act(async () => container.querySelector('button')?.click());
    const dialog = document.querySelector('[role="dialog"]');
    await act(async () => {
      fillAutofillField(dialog!.querySelector<HTMLInputElement>('input[type="email"]')!, 'qa@lunidex.invalid');
      fillAutofillField(dialog!.querySelector<HTMLInputElement>('input[type="password"]')!, 'synthetic-only-password');
      const name = dialog?.querySelector<HTMLInputElement>('input[autocomplete="name"]');
      if (name) fillAutofillField(name, 'QA trainer');
    });
    await act(async () => {
      dialog?.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(authAction).toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('keeps the form open if the SDK cannot be loaded', async () => {
    mocks.loadClient.mockResolvedValue(null);
    await act(async () => root.render(createElement(AuthProvider, null, createElement(ModalOwner, { initialMode: 'signin' }))));
    await act(async () => container.querySelector('button')?.click());
    const dialog = document.querySelector('[role="dialog"]');
    await act(async () => {
      fillAutofillField(dialog!.querySelector<HTMLInputElement>('input[type="email"]')!, 'qa@lunidex.invalid');
      fillAutofillField(dialog!.querySelector<HTMLInputElement>('input[type="password"]')!, 'synthetic-only-password');
    });
    await act(async () => {
      dialog?.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(dialog?.querySelector('[role="alert"]')?.textContent).toBe('Authentication is temporarily unavailable.');
  });
});
