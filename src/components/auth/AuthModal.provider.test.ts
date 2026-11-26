// @vitest-environment jsdom

import { act, createElement, useState, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cachedClient: null as object | null,
  signIn: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn(),
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseAuthConfigured: true,
  getSupabaseAuthClient: () => mocks.cachedClient,
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

import { AuthProvider, useAuth } from '@/lib/supabase/AuthProvider';
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

describe('AuthModal with Supabase SSR Auth', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubEnv('NEXT_PUBLIC_AUTH_REGISTRATION_ENABLED', 'false');
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'qa-user', email: 'qa@lunidex.invalid', user_metadata: { name: 'QA trainer' } } }, error: null });
    mocks.signIn.mockResolvedValue({
      data: { session: { access_token: 'synthetic-token', user: { id: 'qa-user', email: 'qa@lunidex.invalid' } } },
      error: null,
    });
    const client = {
      auth: {
        getSession: mocks.getSession,
        getUser: mocks.getUser,
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
        signInWithPassword: mocks.signIn,
        signUp: mocks.signUp,
        resetPasswordForEmail: mocks.resetPassword,
        signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        verifyOtp: mocks.verifyOtp,
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        updateUser: mocks.updateUser,
      },
    };
    mocks.verifyOtp.mockResolvedValue({
      data: {
        user: { id: 'recovery-user', email: 'qa@lunidex.invalid', user_metadata: {} },
        session: { user: { id: 'recovery-user' } },
      },
      error: null,
    });
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.cachedClient = client;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ allowed: true }) }));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it.each(['signin', 'signup'] as const)('keeps the %s form mounted until the first Auth request finishes', async (initialMode) => {
    if (initialMode === 'signup') vi.stubEnv('NEXT_PUBLIC_AUTH_REGISTRATION_ENABLED', 'true');
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

    // Completing the Auth request must not remount the owner and reset its form state.
    const dialogWhilePending = document.querySelector('[role="dialog"]');
    await act(async () => finishRequest({ error: { message: 'Synthetic test rejection' } }));
    expect(dialogWhilePending).toBe(dialog);
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(email?.value).toBe('qa@lunidex.invalid');
    expect(password?.value).toBe('synthetic-only-password');
    expect(dialog?.querySelector('[role="alert"]')?.textContent).toBe('Something went wrong. Please try again.');
    expect(authAction).toHaveBeenCalledWith(expect.objectContaining({
      email: 'qa@lunidex.invalid', password: 'synthetic-only-password',
    }));
  });

  it('keeps the form open after requesting a password reset', async () => {
    mocks.resetPassword.mockResolvedValue({ error: null });
    await act(async () => root.render(createElement(AuthProvider, null, createElement(ModalOwner, { initialMode: 'signin' }))));
    await act(async () => container.querySelector('button')?.click());
    const dialog = document.querySelector('[role="dialog"]');
    const email = dialog?.querySelector<HTMLInputElement>('input[type="email"]');
    await act(async () => fillAutofillField(email!, 'qa@lunidex.invalid'));
    const reset = Array.from(dialog?.querySelectorAll('button') ?? []).find(button => button.textContent === 'Forgot password?');
    await act(async () => reset?.click());
    expect(mocks.resetPassword).toHaveBeenCalledWith('qa@lunidex.invalid', expect.objectContaining({
      redirectTo: expect.stringContaining('/auth/callback?next='),
    }));
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(email?.value).toBe('qa@lunidex.invalid');
  });

  it.each(['signin', 'signup'] as const)('still closes after a successful first %s request', async (initialMode) => {
    if (initialMode === 'signup') vi.stubEnv('NEXT_PUBLIC_AUTH_REGISTRATION_ENABLED', 'true');
    const authAction = initialMode === 'signin' ? mocks.signIn : mocks.signUp;
    authAction.mockResolvedValue(initialMode === 'signin'
      ? { data: { session: { access_token: 'synthetic-token', user: { id: 'qa-user', email: 'qa@lunidex.invalid' } } }, error: null }
      : { error: null });
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

  it('shows an unavailable-service message for Supabase Auth outages', async () => {
    mocks.signIn.mockResolvedValue({
      error: {
        message: 'Auth service is unavailable',
        status: 503,
      },
    });
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

    expect(dialog?.querySelector('[role="alert"]')?.textContent)
      .toBe('The service is temporarily unavailable. Please try again.');
  });

  it('keeps a verified recovery session available when the first password update is rejected', async () => {
    function ExposeAuthAction() {
      const updatePassword = useAuth().updatePassword;
      return createElement('button', {
        id: 'submit-recovery-password',
        onClick: () => { void updatePassword('synthetic-new-password', 'hash:opaque-token').then(submitResult); },
      }, 'Submit recovery password');
    }
    const submitResult = vi.fn();

    mocks.updateUser
      .mockResolvedValueOnce({ error: { name: 'AuthApiError', message: 'Password is too weak.' } })
      .mockResolvedValueOnce({ error: null });
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { id: 'recovery-user', email: 'qa@lunidex.invalid', user_metadata: {} } },
      error: null,
    });
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'synthetic-recovery-token', user: { id: 'recovery-user', email: 'qa@lunidex.invalid' } } },
      error: null,
    });

    await act(async () => root.render(createElement(AuthProvider, null, createElement(ExposeAuthAction))));

    await act(async () => container.querySelector<HTMLButtonElement>('#submit-recovery-password')?.click());
    expect(submitResult).toHaveBeenLastCalledWith({ error: { name: 'AuthError', message: 'Password is too weak.' } });

    submitResult.mockClear();
    await act(async () => container.querySelector<HTMLButtonElement>('#submit-recovery-password')?.click());
    expect(submitResult).toHaveBeenLastCalledWith({ error: null });
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: 'opaque-token', type: 'recovery' });
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    expect(mocks.updateUser).toHaveBeenCalledTimes(2);
  });

  it('does not reuse a verified recovery link after the active account changes', async () => {
    const submitResult = vi.fn();
    function ExposeAuthAction() {
      const updatePassword = useAuth().updatePassword;
      return createElement('button', {
        id: 'submit-recovery-password',
        onClick: () => { void updatePassword('synthetic-new-password', 'hash:opaque-token').then(submitResult); },
      }, 'Submit recovery password');
    }

    mocks.updateUser
      .mockResolvedValueOnce({ error: { name: 'AuthApiError', message: 'Temporary update failure.' } })
      .mockResolvedValueOnce({ error: null });
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { id: 'different-user', email: 'other@lunidex.invalid', user_metadata: {} } },
      error: null,
    });
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'synthetic-recovery-token', user: { id: 'recovery-user', email: 'qa@lunidex.invalid' } } },
      error: null,
    });

    await act(async () => root.render(createElement(AuthProvider, null, createElement(ExposeAuthAction))));
    await act(async () => container.querySelector<HTMLButtonElement>('#submit-recovery-password')?.click());
    submitResult.mockClear();
    await act(async () => container.querySelector<HTMLButtonElement>('#submit-recovery-password')?.click());

    expect(submitResult).toHaveBeenLastCalledWith({
      error: { name: 'Error', message: 'The recovery session is missing.' },
    });
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
  });
});
