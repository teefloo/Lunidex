'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether Supabase credentials are present. When false the app keeps working
 * fully offline against IndexedDB — no account UI is shown and no network
 * calls are made. This keeps the local-first experience intact out of the box.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let cachedClient: SupabaseClient | null = null;

/**
 * Returns the singleton browser Supabase client, or null when unconfigured.
 * Only the public anon key is used client-side; row access is enforced by RLS.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (cachedClient) return cachedClient;

  cachedClient = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Lets OAuth redirects (?code=...) complete the session on return.
      detectSessionInUrl: true,
      storageKey: 'primedex-auth',
      flowType: 'pkce',
    },
  });

  return cachedClient;
}
