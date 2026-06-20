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
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
      };
    }

    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;

    return {
      enabled: true,
      loading,
      session,
      user: session?.user ?? null,
      signUp: async (email, password, name) => {
        const trimmedName = name?.trim();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: trimmedName ? { name: trimmedName, display_name: trimmedName } : undefined,
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
          redirectTo,
        });
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
