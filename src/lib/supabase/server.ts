import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Server-side mirror of `isSupabaseConfigured` (client.ts). When false, route
 * handlers degrade gracefully and the leaderboard simply does not exist — the
 * app stays fully local-first.
 */
export const isSupabaseConfiguredServer = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Creates a request-scoped Supabase client for use inside route handlers.
 *
 * When an access token is provided it is forwarded as the `Authorization`
 * header, so PostgREST resolves `auth.uid()` and Row-Level Security applies as
 * the authenticated user — this is what makes owner-only writes enforceable.
 * Without a token the client is anonymous (public reads only).
 *
 * Only the public anon key is used; the `service_role` key is never read here.
 */
export function getSupabaseServerClient(accessToken?: string): SupabaseClient | null {
  if (!isSupabaseConfiguredServer) return null;

  return createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

/** Extracts a Bearer token from an `Authorization` header value. */
export function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1] : null;
}
