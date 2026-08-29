'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { isSupportedLanguage } from '@/lib/languages';
import { normalizeDisplayName } from '@/lib/json-ld';
import { getNeonAuthClient, isNeonAuthConfigured, loadNeonAuthClient } from './client';

export interface AppUser {
  id: string;
  email: string;
  created_at?: string;
  user_metadata: {
    name?: string;
    display_name?: string;
  };
}

export interface AppSession {
  user: AppUser;
  expires_at: number | null;
}

export interface AuthErrorLike {
  name: string;
  message: string;
}

type AuthResult = { error: AuthErrorLike | null };

interface AuthContextValue {
  enabled: boolean;
  loading: boolean;
  session: AppSession | null;
  user: AppUser | null;
  signUp: (email: string, password: string, name?: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string, resetToken?: string) => Promise<AuthResult>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeError(error: unknown): AuthErrorLike | null {
  if (!error) return null;
  if (typeof error === 'string') return { name: 'AuthError', message: error };
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return { name: 'AuthTimeout', message: 'Authentication is taking too long. Please try again.' };
    }
    return { name: error.name, message: error.message };
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return { name: 'AuthError', message };
  }

  if (typeof error === 'object' && error !== null && 'error' in error) {
    const nested = (error as { error?: unknown }).error;
    if (nested && nested !== error) return normalizeError(nested);
  }

  return { name: 'AuthError', message: 'Authentication failed.' };
}

function normalizeAuthEmail(email: string): string {
  return email.trim();
}

function mapUser(user: {
  id: string;
  email: string;
  name?: string | null;
  createdAt?: Date | string;
}): AppUser {
  const name = user.name?.trim() || undefined;
  return {
    id: user.id,
    email: user.email,
    created_at: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
    user_metadata: name ? { name, display_name: name } : {},
  };
}

type ConnectedAuthClient = NonNullable<ReturnType<typeof getNeonAuthClient>>;
type SessionData = Awaited<ReturnType<ConnectedAuthClient['getSession']>>['data'];

type AuthActionResponse = { error?: unknown; data?: unknown };
type SignInInput = { email: string; password: string; callbackURL?: string };
type SignUpInput = SignInInput & { name: string };
type SocialSignInInput = { provider: 'google' | 'github'; callbackURL?: string };
type ResetRequestInput = { email: string; redirectTo?: string };
type ResetPasswordInput = { newPassword: string; token: string };

const AUTH_ACTION_TIMEOUT_MS = 15_000;
const AUTH_SESSION_TIMEOUT_MS = 5_000;
const AUTH_SDK_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const error = new Error('Authentication request timed out.');
      error.name = 'TimeoutError';
      reject(error);
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

/**
 * The Neon package has shipped more than one browser adapter shape. Keep the
 * expected Better Auth methods typed locally, then use the first-party route
 * proxy when an adapter omits one of the nested actions at runtime.
 */
interface RuntimeAuthClient {
  signUp?: { email?: (input: SignUpInput) => Promise<AuthActionResponse> };
  signIn?: {
    email?: (input: SignInInput) => Promise<AuthActionResponse>;
    social?: (input: SocialSignInInput) => Promise<AuthActionResponse>;
  };
  signOut?: () => Promise<unknown>;
  requestPasswordReset?: (input: ResetRequestInput) => Promise<AuthActionResponse>;
  resetPassword?: (input: ResetPasswordInput) => Promise<AuthActionResponse>;
}

function asRuntimeAuthClient(client: ConnectedAuthClient): RuntimeAuthClient {
  return client as unknown as RuntimeAuthClient;
}

function notifyAuthStateChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('primedex:auth-changed'));
}

async function requestAuthProxy(path: string, body: Record<string, string | undefined>): Promise<AuthActionResponse> {
  try {
    const response = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      signal: AbortSignal.timeout(AUTH_ACTION_TIMEOUT_MS),
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => null) as unknown;
    if (response.ok) {
      notifyAuthStateChanged();
      return { data: result, error: null };
    }
    return { error: result ?? { message: 'Authentication request failed.' } };
  } catch (error) {
    return { error };
  }
}

async function requestAuthSession(): Promise<{ data: SessionData }> {
  const response = await fetch('/api/auth/get-session', {
    headers: { Accept: 'application/json' },
    credentials: 'include',
    cache: 'no-store',
    signal: AbortSignal.timeout(AUTH_SESSION_TIMEOUT_MS),
  });
  const result = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const message = normalizeError(result)?.message
      ?? response.statusText
      ?? 'Authentication session request failed.';
    throw new Error(message);
  }

  return { data: result as SessionData };
}

async function signInWithFallback(
  client: ConnectedAuthClient,
  input: SignInInput,
): Promise<AuthActionResponse> {
  const runtimeClient = asRuntimeAuthClient(client);
  if (typeof runtimeClient.signIn?.email === 'function') {
    try {
      const result = await withTimeout(
        runtimeClient.signIn.email(input),
        AUTH_SDK_TIMEOUT_MS,
      );
      if (!result.error) notifyAuthStateChanged();
      return result;
    } catch {
      // Some Neon Auth browser adapters expose signIn.email but fail before
      // returning a response. A same-origin proxy retry keeps login usable
      // across those adapter versions; sign-in is safe to retry.
      return requestAuthProxy('sign-in/email', input);
    }
  }
  return requestAuthProxy('sign-in/email', input);
}

async function confirmSignedIn(): Promise<AuthErrorLike | null> {
  let lastError: AuthErrorLike | null = null;
  for (const delayMs of [0, 80, 240]) {
    if (delayMs > 0) await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    try {
      const result = await requestAuthSession();
      if (result.data?.session && result.data.user) {
        notifyAuthStateChanged();
        return null;
      }
    } catch (error) {
      lastError = normalizeError(error);
    }
  }

  return lastError ?? {
    name: 'AuthSessionUnavailable',
    message: 'The sign-in session could not be confirmed.',
  };
}

async function signUpWithFallback(
  client: ConnectedAuthClient,
  input: SignUpInput,
): Promise<AuthActionResponse> {
  const runtimeClient = asRuntimeAuthClient(client);
  if (typeof runtimeClient.signUp?.email === 'function') {
    const result = await runtimeClient.signUp.email(input);
    if (!result.error) notifyAuthStateChanged();
    return result;
  }
  return requestAuthProxy('sign-up/email', input);
}

async function socialSignInWithFallback(
  client: ConnectedAuthClient,
  input: SocialSignInInput,
): Promise<AuthActionResponse> {
  const runtimeClient = asRuntimeAuthClient(client);
  if (typeof runtimeClient.signIn?.social === 'function') {
    const result = await runtimeClient.signIn.social(input);
    if (!result.error) notifyAuthStateChanged();
    return result;
  }
  return requestAuthProxy('sign-in/social', input);
}

async function requestPasswordResetWithFallback(
  client: ConnectedAuthClient,
  input: ResetRequestInput,
): Promise<AuthActionResponse> {
  const runtimeClient = asRuntimeAuthClient(client);
  if (typeof runtimeClient.requestPasswordReset === 'function') {
    return runtimeClient.requestPasswordReset(input);
  }
  return requestAuthProxy('request-password-reset', input);
}

async function resetPasswordWithFallback(
  client: ConnectedAuthClient,
  input: ResetPasswordInput,
): Promise<AuthActionResponse> {
  const runtimeClient = asRuntimeAuthClient(client);
  if (typeof runtimeClient.resetPassword === 'function') {
    const result = await runtimeClient.resetPassword(input);
    if (!result.error) notifyAuthStateChanged();
    return result;
  }
  return requestAuthProxy('reset-password', input);
}

async function signOutWithFallback(client: ConnectedAuthClient): Promise<void> {
  const runtimeClient = asRuntimeAuthClient(client);
  if (typeof runtimeClient.signOut === 'function') {
    await runtimeClient.signOut();
    notifyAuthStateChanged();
    return;
  }
  await requestAuthProxy('sign-out', {});
}

function getRedirectTo(): string | undefined {
  return typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : undefined;
}

function getResetRedirectTo(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const locale = window.location.pathname.split('/').filter(Boolean)[0];
  const prefix = isSupportedLanguage(locale ?? '') ? `/${locale}` : '/en';
  return `${window.location.origin}${prefix}/auth/reset-password`;
}

export function isAuthSensitivePath(pathname: string): boolean {
  // The shared home CTA and site header both depend on the current session.
  // Initialize auth on every route so a signed-in user is recognized from the
  // landing page as well as from the rest of the application.
  void pathname;
  return true;
}

function DisabledAuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => {
    const noop = async (): Promise<AuthResult> => ({
      error: { name: 'NotConfigured', message: 'Neon Auth is not configured.' },
    });

    return {
      enabled: false,
      loading: false,
      session: null,
      user: null,
      signUp: noop,
      signIn: noop,
      signInWithOAuth: noop as AuthContextValue['signInWithOAuth'],
      signOut: async () => {},
      resetPassword: noop,
      updatePassword: noop,
    };
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function DeferredAuthProvider({
  children,
  onLoaded,
}: {
  children: ReactNode;
  onLoaded: (client: ConnectedAuthClient) => void;
}) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const loadClient = useCallback(async (): Promise<ConnectedAuthClient | null> => {
    const cachedClient = getNeonAuthClient();
    if (cachedClient) {
      onLoaded(cachedClient);
      return cachedClient;
    }

    setLoading(true);
    try {
      const loadedClient = await loadNeonAuthClient();
      if (loadedClient) onLoaded(loadedClient);
      return loadedClient;
    } finally {
      setLoading(false);
    }
  }, [onLoaded]);

  useEffect(() => {
    if (isAuthSensitivePath(pathname ?? '')) void loadClient();
  }, [loadClient, pathname]);

  const redirectTo = getRedirectTo();
  const resetRedirectTo = getResetRedirectTo();
  const value = useMemo<AuthContextValue>(() => {
    const unavailable = (): AuthResult => ({
      error: { name: 'AuthUnavailable', message: 'Authentication is temporarily unavailable.' },
    });

    return {
      enabled: true,
      loading,
      session: null,
      user: null,
      signUp: async (email, password, name) => {
        const normalizedEmail = normalizeAuthEmail(email);
        const normalizedName = name === undefined ? 'Lunidex trainer' : normalizeDisplayName(name);
        if (!normalizedName) {
          return {
            error: {
              name: 'ValidationError',
              message: 'Enter a display name containing visible characters.',
            },
          };
        }

        const client = await loadClient();
        if (!client) return unavailable();
        try {
          const result = await signUpWithFallback(client, {
            email: normalizedEmail,
            password,
            name: normalizedName,
            callbackURL: redirectTo,
          });
          return { error: normalizeError(result.error) };
        } catch (error) {
          return { error: normalizeError(error) };
        }
      },
      signIn: async (email, password) => {
        const normalizedEmail = normalizeAuthEmail(email);
        if (!normalizedEmail) {
          return { error: { name: 'ValidationError', message: 'Enter your email address.' } };
        }
        const client = await loadClient();
        if (!client) return unavailable();
        try {
          const result = await signInWithFallback(client, { email: normalizedEmail, password, callbackURL: redirectTo });
          const actionError = normalizeError(result.error);
          return { error: actionError ?? await confirmSignedIn() };
        } catch (error) {
          return { error: normalizeError(error) };
        }
      },
      signInWithOAuth: async (provider) => {
        const client = await loadClient();
        if (!client) return unavailable();
        try {
          const result = await socialSignInWithFallback(client, { provider, callbackURL: redirectTo });
          return { error: normalizeError(result.error) };
        } catch (error) {
          return { error: normalizeError(error) };
        }
      },
      signOut: async () => {
        const client = await loadClient();
        if (client) await signOutWithFallback(client);
      },
      resetPassword: async (email) => {
        const normalizedEmail = normalizeAuthEmail(email);
        if (!normalizedEmail) {
          return { error: { name: 'ValidationError', message: 'Enter your email address.' } };
        }
        const client = await loadClient();
        if (!client) return unavailable();
        try {
          const result = await requestPasswordResetWithFallback(client, { email: normalizedEmail, redirectTo: resetRedirectTo });
          return { error: normalizeError(result.error) };
        } catch (error) {
          return { error: normalizeError(error) };
        }
      },
      updatePassword: async (password, resetToken) => {
        if (!resetToken) {
          return { error: { name: 'InvalidToken', message: 'The password reset link is invalid or expired.' } };
        }

        const client = await loadClient();
        if (!client) return unavailable();
        try {
          const result = await resetPasswordWithFallback(client, { newPassword: password, token: resetToken });
          return { error: normalizeError(result.error) };
        } catch (error) {
          return { error: normalizeError(error) };
        }
      },
    };
  }, [loading, loadClient, redirectTo, resetRedirectTo]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useClientSession(): { data: SessionData; isPending: boolean } {
  // Read through the first-party route proxy instead of calling an SDK method
  // whose shape differs between Neon Auth browser bundles. This keeps the
  // session cookie on the Lunidex origin and works across those bundles.
  const [state, setState] = useState<{ data: SessionData; isPending: boolean }>({
    data: null,
    isPending: true,
  });

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await requestAuthSession();
        if (active) setState({ data: result.data, isPending: false });
      } catch {
        if (active) setState({ data: null, isPending: false });
      }
    };

    void refresh();
    const refreshOnFocus = () => void refresh();
    const refreshOnAuthChange = () => void refresh();
    window.addEventListener('focus', refreshOnFocus);
    window.addEventListener('primedex:auth-changed', refreshOnAuthChange);
    const intervalId = window.setInterval(refreshOnFocus, 30_000);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshOnFocus);
      window.removeEventListener('primedex:auth-changed', refreshOnAuthChange);
      window.clearInterval(intervalId);
    };
  }, []);

  return state;
}

function ConnectedAuthProvider({ children, client }: { children: ReactNode; client: ConnectedAuthClient }) {
  const authState = useClientSession();
  const sessionData = authState.data;
  const { session, user } = useMemo(() => {
    const mappedUser = sessionData?.user ? mapUser(sessionData.user) : null;
    const mappedSession: AppSession | null = sessionData?.session && mappedUser
      ? {
        user: mappedUser,
        expires_at: Math.floor(new Date(sessionData.session.expiresAt).getTime() / 1000),
      }
      : null;
    return { session: mappedSession, user: mappedUser };
  }, [sessionData]);

  const redirectTo = getRedirectTo();
  const resetRedirectTo = getResetRedirectTo();

  const value = useMemo<AuthContextValue>(() => ({
    enabled: true,
    loading: authState.isPending,
    session,
    user,
    signUp: async (email, password, name) => {
      const normalizedEmail = normalizeAuthEmail(email);
      const normalizedName = name === undefined ? 'Lunidex trainer' : normalizeDisplayName(name);
      if (!normalizedName) {
        return {
          error: {
            name: 'ValidationError',
            message: 'Enter a display name containing visible characters.',
          },
        };
      }

      try {
        const result = await signUpWithFallback(client, {
          email: normalizedEmail,
          password,
          name: normalizedName,
          callbackURL: redirectTo,
        });
        return { error: normalizeError(result.error) };
      } catch (error) {
        return { error: normalizeError(error) };
      }
    },
    signIn: async (email, password) => {
      const normalizedEmail = normalizeAuthEmail(email);
      if (!normalizedEmail) {
        return { error: { name: 'ValidationError', message: 'Enter your email address.' } };
      }
      try {
        const result = await signInWithFallback(client, { email: normalizedEmail, password, callbackURL: redirectTo });
        const actionError = normalizeError(result.error);
        return { error: actionError ?? await confirmSignedIn() };
      } catch (error) {
        return { error: normalizeError(error) };
      }
    },
    signInWithOAuth: async (provider) => {
      try {
        const result = await socialSignInWithFallback(client, { provider, callbackURL: redirectTo });
        return { error: normalizeError(result.error) };
      } catch (error) {
        return { error: normalizeError(error) };
      }
    },
    signOut: async () => {
      await signOutWithFallback(client);
    },
    resetPassword: async (email) => {
      const normalizedEmail = normalizeAuthEmail(email);
      if (!normalizedEmail) {
        return { error: { name: 'ValidationError', message: 'Enter your email address.' } };
      }
      try {
        const result = await requestPasswordResetWithFallback(client, { email: normalizedEmail, redirectTo: resetRedirectTo });
        return { error: normalizeError(result.error) };
      } catch (error) {
        return { error: normalizeError(error) };
      }
    },
    updatePassword: async (password, resetToken) => {
      if (!resetToken) {
        return { error: { name: 'InvalidToken', message: 'The password reset link is invalid or expired.' } };
      }

      try {
        const result = await resetPasswordWithFallback(client, { newPassword: password, token: resetToken });
        return { error: normalizeError(result.error) };
      } catch (error) {
        return { error: normalizeError(error) };
      }
    },
  }), [authState.isPending, client, redirectTo, resetRedirectTo, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ConnectedAuthClient | null>(() => getNeonAuthClient());
  if (!isNeonAuthConfigured) return <DisabledAuthProvider>{children}</DisabledAuthProvider>;
  if (!client) return <DeferredAuthProvider onLoaded={setClient}>{children}</DeferredAuthProvider>;
  return <ConnectedAuthProvider client={client}>{children}</ConnectedAuthProvider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
