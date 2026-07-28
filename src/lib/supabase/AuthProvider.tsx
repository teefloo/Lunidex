'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User, AuthError, Provider } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import { normalizeDisplayName } from '@/lib/json-ld';
import { isSupportedLanguage } from '@/lib/languages';

type AuthResult = { error: AuthError | null };

interface AuthContextValue {
  /** True only when Supabase env vars are present. */
  enabled: boolean;
  /** Still resolving the initial session. */
  loading: boolean;
  session: Session | null;
  user: User | null;
  signUp: (email: string, password: string, name?: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithOAuth: (provider: Provider) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  // No client → nothing to resolve, so we are not loading.
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(() => {
    const noop = async (): Promise<AuthResult> => ({
      error: { name: 'NotConfigured', message: 'Supabase is not configured.' } as AuthError,
    });

    if (!supabase) {
      return {
        enabled: false,
        loading: false,
        session: null,
        user: null,
        signUp: noop,
        signIn: noop,
        signInWithOAuth: noop,
        signOut: async () => {},
        resetPassword: noop,
        updatePassword: noop,
      };
    }

    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;
    const resetRedirectTo = typeof window !== 'undefined'
      ? (() => {
        const locale = window.location.pathname.split('/').filter(Boolean)[0];
        const localizedPrefix = isSupportedLanguage(locale ?? '') ? `/${locale}` : '/en';
        return `${window.location.origin}${localizedPrefix}/auth/reset-password`;
      })()
      : undefined;

    return {
      enabled: true,
      loading,
      session,
      user: session?.user ?? null,
      signUp: async (email, password, name) => {
        const normalizedName = name === undefined ? undefined : normalizeDisplayName(name);
        if (name !== undefined && !normalizedName) {
          return {
            error: {
              name: 'ValidationError',
              message: 'Enter a display name containing visible characters.',
            } as AuthError,
          };
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: normalizedName ? { name: normalizedName, display_name: normalizedName } : undefined,
          },
        });
        return { error };
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
      },
      signInWithOAuth: async (provider) => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo },
        });
        return { error };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: resetRedirectTo,
        });
        return { error };
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        return { error };
      },
    };
  }, [supabase, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
