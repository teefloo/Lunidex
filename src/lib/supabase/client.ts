'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseAuthConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

let browserClient: SupabaseClient | null = null;

/** Returns the cookie-backed browser client, or null when public config is absent. */
export function getSupabaseAuthClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      flowType: 'pkce',
    },
  });
  return browserClient;
}

/** Returns a current Supabase access token for same-origin APIs. */
export async function getSupabaseAccessToken(): Promise<string | null> {
  const client = getSupabaseAuthClient();
  if (!client) return null;

  try {
    const { data, error } = await client.auth.getSession();
    return error ? null : data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
