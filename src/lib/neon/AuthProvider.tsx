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
  if (error instanceof Error) return { name: error.name, message: error.message };

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return { name: 'AuthError', message };
  }

  return { name: 'AuthError', message: 'Authentication failed.' };
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
  const segments = pathname.split('/').filter(Boolean);
  const pathWithoutLocale = isSupportedLanguage(segments[0] ?? '')
    ? `/${segments.slice(1).join('/')}`
    : pathname;

  return /^\/(?:dashboard|favorites|friends|team|tcg\/(?:collection|wishlist))(?:\/|$)/.test(pathWithoutLocale);
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
  const [loading, setLoading] = useState(false);
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
          const result = await client.signUp.email({
            email,
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
        const client = await loadClient();
        if (!client) return unavailable();
        try {
          const result = await client.signIn.email({ email, password, callbackURL: redirectTo });
          return { error: normalizeError(result.error) };
        } catch (error) {
          return { error: normalizeError(error) };
        }
      },
      signInWithOAuth: async (provider) => {
        const client = await loadClient();
        if (!client) return unavailable();
        try {
          const result = await client.signIn.social({ provider, callbackURL: redirectTo });
          return { error: normalizeError(result.error) };
        } catch (error) {
          return { error: normalizeError(error) };
        }
      },
      signOut: async () => {
        const client = await loadClient();
        if (client) await client.signOut();
      },
      resetPassword: async (email) => {
        const client = await loadClient();
        if (!client) return unavailable();
        try {
          const result = await client.requestPasswordReset({ email, redirectTo: resetRedirectTo });
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
          const result = await client.resetPassword({ newPassword: password, token: resetToken });
          return { error: normalizeError(result.error) };
        } catch (error) {
          return { error: normalizeError(error) };
        }
      },
    };
  }, [loading, loadClient, redirectTo, resetRedirectTo]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useClientSession(client: ConnectedAuthClient): { data: SessionData; isPending: boolean } {
  const [state, setState] = useState<{ data: SessionData; isPending: boolean }>({
    data: null,
    isPending: true,
  });

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await client.getSession();
        if (active) setState({ data: result.data, isPending: false });
      } catch {
        if (active) setState({ data: null, isPending: false });
      }
    };

    void refresh();
    const refreshOnFocus = () => void refresh();
    window.addEventListener('focus', refreshOnFocus);
    const intervalId = window.setInterval(refreshOnFocus, 30_000);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshOnFocus);
      window.clearInterval(intervalId);
    };
  }, [client]);

  return state;
}

function ConnectedAuthProvider({ children, client }: { children: ReactNode; client: ConnectedAuthClient }) {
  const authState = useClientSession(client);
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
        const result = await client.signUp.email({
          email,
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
      try {
        const result = await client.signIn.email({ email, password, callbackURL: redirectTo });
        return { error: normalizeError(result.error) };
      } catch (error) {
        return { error: normalizeError(error) };
      }
    },
    signInWithOAuth: async (provider) => {
      try {
        const result = await client.signIn.social({ provider, callbackURL: redirectTo });
        return { error: normalizeError(result.error) };
      } catch (error) {
        return { error: normalizeError(error) };
      }
    },
    signOut: async () => {
      await client.signOut();
    },
    resetPassword: async (email) => {
      try {
        const result = await client.requestPasswordReset({ email, redirectTo: resetRedirectTo });
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
        const result = await client.resetPassword({ newPassword: password, token: resetToken });
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
