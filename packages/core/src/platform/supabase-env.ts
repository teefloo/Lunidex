/**
 * Web Supabase configuration. Credentials come from Next.js public env vars and
 * the auth flow relies on browser storage + URL session detection (PKCE).
 *
 * The mobile build resolves `supabase-env.native.ts` instead.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseAuthOptions = {
  persistSession: true,
  autoRefreshToken: true,
  // Lets OAuth redirects (?code=...) complete the session on return.
  detectSessionInUrl: true,
  storageKey: 'primedex-auth',
  flowType: 'pkce' as const,
};
