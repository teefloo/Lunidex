'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { isSupportedLanguage } from '@/lib/languages';
import { normalizeDisplayName } from '@/lib/json-ld';
import { getSupabaseAuthClient, isSupabaseAuthConfigured } from './client';
import { rememberProductOauth } from '@/lib/product-measurement';
import { POSTHOG_EVENTS, type PostHogEventName, type PostHogProperties } from '@/lib/posthog-events';

function captureAuthPostHogEvent(event: PostHogEventName, properties: PostHogProperties): void {
  if (event === POSTHOG_EVENTS.authOauthStarted && typeof properties.method === 'string') {
    if (properties.result === 'started') rememberProductOauth(properties.method, true);
    else if (properties.result === 'error') rememberProductOauth(properties.method, false);
  }
  void import('@/lib/posthog-client')
    .then(({ capturePostHogEvent }) => capturePostHogEvent(event, properties))
    .catch(() => {});
}

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
  sessionStatus: 'checking' | 'resolved' | 'unavailable';
  retrySession: () => void;
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
  if (typeof error === 'object') {
    const candidate = error as { status?: unknown; code?: unknown };
    const status = candidate.status;
    const code = typeof candidate.code === 'string' ? candidate.code.toLowerCase() : '';
    if (status === 402 || status === 429 || status === 500 || status === 502 || status === 503
      || code.includes('rate_limit') || code.includes('temporarily_unavailable')) {
      return { name: 'AuthUnavailable', message: 'Authentication is temporarily unavailable.' };
    }
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return { name: 'AuthTimeout', message: 'Authentication is taking too long. Please try again.' };
    }
    return { name: error.name, message: error.message };
  }
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return { name: 'AuthError', message: error.message };
  }
  return { name: 'AuthError', message: 'Authentication failed.' };
}

function mapUser(user: User): AppUser | null {
  const email = user.email?.trim();
  if (!email) return null;
  const metadata = user.user_metadata;
  const rawName = metadata.name ?? metadata.full_name ?? metadata.display_name;
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  return {
    id: user.id,
    email,
    created_at: user.created_at,
    user_metadata: name ? { name, display_name: name } : {},
  };
}

function mapSession(session: Session | null): AppSession | null {
  const user = session ? mapUser(session.user) : null;
  if (!session || !user) return null;
  return { user, expires_at: session.expires_at ?? null };
}

function localePrefix(): string {
  if (typeof window === 'undefined') return '/en';
  const locale = window.location.pathname.split('/').filter(Boolean)[0] ?? '';
  return isSupportedLanguage(locale) ? `/${locale}` : '/en';
}

function authCallbackUrl(nextPath: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const callback = new URL(`${localePrefix()}/auth/callback`, window.location.origin);
  callback.searchParams.set('next', nextPath);
  return callback.toString();
}

function DisabledAuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => {
    const noop = async (): Promise<AuthResult> => ({
      error: { name: 'NotConfigured', message: 'Supabase Auth is not configured.' },
    });
    return {
      enabled: false,
      loading: false,
      sessionStatus: 'resolved',
      retrySession: () => {},
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

function ConnectedAuthProvider({ client, children }: { client: SupabaseClient; children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [status, setStatus] = useState<AuthContextValue['sessionStatus']>('checking');
  const [revision, setRevision] = useState(0);
  const retrySession = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    const update = async () => {
      try {
        const { data, error } = await client.auth.getSession();
        if (!active) return;
        if (error) {
          setStatus('unavailable');
          return;
        }
        setSession(mapSession(data.session));
        setStatus('resolved');
      } catch {
        if (active) setStatus('unavailable');
      }
    };
    void update();
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(mapSession(nextSession));
      setStatus('resolved');
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') void update();
    };
    window.addEventListener('primedex:auth-changed', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      window.removeEventListener('primedex:auth-changed', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [client, revision]);

  const value = useMemo<AuthContextValue>(() => {
    const currentUser = session?.user ?? null;
    const run = async (action: () => Promise<{ error: { message: string; name?: string } | null }>): Promise<AuthResult> => {
      try {
        const result = await action();
        return { error: normalizeError(result.error) };
      } catch (error) {
        return { error: normalizeError(error) };
      }
    };
    return {
      enabled: true,
      loading: status === 'checking',
      sessionStatus: status,
      retrySession,
      session,
      user: currentUser,
      signUp: async (email, password, name) => {
        const normalizedEmail = normalizeEmail(email);
        const displayName = name === undefined ? 'Lunidex trainer' : normalizeDisplayName(name);
        if (!displayName) return { error: { name: 'ValidationError', message: 'Enter a display name containing visible characters.' } };
        rememberProductOauth('password', false);
        return run(async () => {
          const { error } = await client.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              data: { name: displayName, display_name: displayName },
              emailRedirectTo: authCallbackUrl(`${window.location.pathname}`),
            },
          });
          return { error };
        });
      },
      signIn: async (email, password) => {
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) return { error: { name: 'ValidationError', message: 'Enter your email address.' } };
        rememberProductOauth('password', false);
        return run(async () => {
          const { error } = await client.auth.signInWithPassword({ email: normalizedEmail, password });
          if (!error) {
            const { error: verifyError } = await client.auth.getUser();
            if (verifyError) return { error: verifyError };
          }
          return { error };
        });
      },
      signInWithOAuth: async (provider) => {
        captureAuthPostHogEvent(POSTHOG_EVENTS.authOauthStarted, { method: provider, result: 'started' });
        try {
          const { error } = await client.auth.signInWithOAuth({
            provider,
            options: { redirectTo: authCallbackUrl(window.location.pathname) },
          });
          const normalized = normalizeError(error);
          captureAuthPostHogEvent(POSTHOG_EVENTS.authOauthStarted, {
            method: provider,
            result: normalized ? 'error' : 'redirect_started',
            ...(normalized ? { error_type: normalized.name } : {}),
          });
          return { error: normalized };
        } catch (error) {
          const normalized = normalizeError(error);
          captureAuthPostHogEvent(POSTHOG_EVENTS.authOauthStarted, { method: provider, result: 'error', error_type: normalized?.name ?? 'Error' });
          return { error: normalized };
        }
      },
      signOut: async () => {
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) throw error;
        window.dispatchEvent(new Event('primedex:auth-changed'));
      },
      resetPassword: async (email) => {
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) return { error: { name: 'ValidationError', message: 'Enter your email address.' } };
        return run(async () => {
          const recoveryPath = `${localePrefix()}/auth/reset-password?mode=recovery`;
          const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: authCallbackUrl(recoveryPath),
          });
          return { error };
        });
      },
      updatePassword: async (password, resetToken) => {
        if (!resetToken) return { error: { name: 'InvalidToken', message: 'The password reset link is invalid or expired.' } };
        return run(async () => {
          if (resetToken.startsWith('hash:')) {
            const { error } = await client.auth.verifyOtp({ token_hash: resetToken.slice(5), type: 'recovery' });
            if (error) return { error };
          } else if (resetToken.startsWith('code:')) {
            const { data } = await client.auth.getUser();
            if (!data.user) {
              const { error } = await client.auth.exchangeCodeForSession(resetToken.slice(5));
              if (error) return { error };
            }
          } else if (resetToken === 'session') {
            const { data, error } = await client.auth.getUser();
            if (error || !data.user) return { error: error ?? new Error('The recovery session is missing.') };
          }
          const { error } = await client.auth.updateUser({ password });
          return { error };
        });
      },
    };
  }, [client, retrySession, session, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function normalizeEmail(email: string): string {
  return email.trim();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => getSupabaseAuthClient());
  if (!isSupabaseAuthConfigured || !client) return <DisabledAuthProvider>{children}</DisabledAuthProvider>;
  return <ConnectedAuthProvider client={client}>{children}</ConnectedAuthProvider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
