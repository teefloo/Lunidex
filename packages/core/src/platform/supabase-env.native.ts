import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * React Native Supabase configuration. Credentials come from Expo public env
 * vars and the session is persisted in AsyncStorage. There is no URL to parse
 * on a native device, so `detectSessionInUrl` is disabled.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseAuthOptions = {
  storage: AsyncStorage,
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: false,
  storageKey: 'primedex-auth',
  flowType: 'pkce' as const,
};
