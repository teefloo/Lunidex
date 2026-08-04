import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getNeonAuthClient,
  isNeonAuthConfigured,
  type NeonAuthError,
  type NeonSession,
  type NeonUser,
} from './client';

export interface AppUser {
  id: string;
  email: string;
  user_metadata: { name?: string; display_name?: string };
}

export interface AppSession {
  user: AppUser;
  expires_at: number | null;
}

type AuthResult = { error: NeonAuthError | null };

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
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(user: NeonUser): AppUser {
  const name = user.name.trim() || undefined;
  return {
    id: user.id,
    email: user.email,
    user_metadata: name ? { name, display_name: name } : {},
  };
}

function mapSession(session: NeonSession | null): AppSession | null {
  if (!session) return null;
  return {
    user: mapUser(session.user),
    expires_at: session.expiresAt ? Math.floor(new Date(session.expiresAt).getTime() / 1000) : null,
  };
}

function disabledValue(): AuthContextValue {
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
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = getNeonAuthClient();
  const [session, setSession] = useState<NeonSession | null>(null);
  const [loading, setLoading] = useState(isNeonAuthConfigured);

  useEffect(() => {
    if (!isNeonAuthConfigured) return;
    let active = true;
    void client.getSession().then((nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
    }).catch(() => {
      if (active) setLoading(false);
    });
    const unsubscribe = client.onAuthStateChange((nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [client]);

  const value = useMemo<AuthContextValue>(() => {
    if (!isNeonAuthConfigured) return disabledValue();
    const mappedSession = mapSession(session);
    return {
      enabled: true,
      loading,
      session: mappedSession,
      user: mappedSession?.user ?? null,
      signUp: (email, password, name) => client.signUp(email, password, name?.trim() || 'Lunidex trainer'),
      signIn: (email, password) => client.signIn(email, password),
      signInWithOAuth: (provider) => client.signInWithOAuth(provider),
      signOut: () => client.signOut(),
      resetPassword: (email) => client.requestPasswordReset(email),
    };
  }, [client, loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
