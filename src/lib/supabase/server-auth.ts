import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export interface SupabaseRequestUser {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
    display_name?: string;
  };
}

function getPublicConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

function mapAuthUser(user: User): SupabaseRequestUser | null {
  const email = user.email?.trim();
  if (!user.id || !email) return null;
  const metadata = user.user_metadata;
  const rawName = metadata.name ?? metadata.full_name ?? metadata.display_name;
  const name = typeof rawName === 'string' ? rawName.trim().slice(0, 120) : '';
  return {
    id: user.id,
    email,
    user_metadata: name ? { name, display_name: name } : {},
  };
}

function parseCookieHeader(header: string | null): Array<{ name: string; value: string }> {
  if (!header) return [];
  return header.split(';').flatMap((part) => {
    const separator = part.indexOf('=');
    if (separator <= 0) return [];
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    return name ? [{ name, value }] : [];
  });
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  const match = authorization ? /^Bearer\s+(.+)$/i.exec(authorization.trim()) : null;
  return match?.[1] ?? null;
}

function createCookieRequestClient(request: Request) {
  const config = getPublicConfig();
  if (!config) return null;
  const requestCookies = parseCookieHeader(request.headers.get('cookie'));
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => requestCookies,
      // Route handlers cannot persist refresh cookies through this helper;
      // the Next proxy refreshes cookies on navigations and API clients also
      // send a bearer token. Authorization always uses auth.getUser().
      setAll: () => {},
    },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

/** Verify either a bearer token or the incoming SSR cookie with Supabase Auth. */
export async function getSupabaseUserFromRequest(request: Request): Promise<SupabaseRequestUser | null> {
  const config = getPublicConfig();
  if (!config) return null;

  try {
    const token = getBearerToken(request);
    let client: SupabaseClient;
    let accessToken: string | undefined;
    if (token) {
      client = createClient(config.url, config.key, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      accessToken = token;
    } else {
      const cookieClient = createCookieRequestClient(request);
      if (!cookieClient) return null;
      client = cookieClient;
    }

    const { data, error } = await client.auth.getUser(accessToken);
    if (error) return null;
    return data.user ? mapAuthUser(data.user) : null;
  } catch {
    return null;
  }
}

/** Read the signed-in user during server rendering; never authorize from getSession(). */
export async function getServerAuthUser(): Promise<SupabaseRequestUser | null> {
  const config = getPublicConfig();
  if (!config) return null;

  try {
    const cookieStore = await cookies();
    const client = createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user ? mapAuthUser(data.user) : null;
  } catch {
    return null;
  }
}

/** Admin operations stay server-only and require an explicitly configured service role. */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const config = getPublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !serviceRoleKey) return null;
  return createClient(config.url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function deleteSupabaseAuthUser(userId: string): Promise<{ success: boolean }> {
  const admin = getSupabaseAdminClient();
  if (!admin) return { success: false };
  const { error } = await admin.auth.admin.deleteUser(userId);
  return { success: !error };
}

/** Re-check an optional password before an account-deletion request mutates data. */
export async function verifySupabasePassword(email: string, password: string, userId: string): Promise<boolean> {
  const config = getPublicConfig();
  if (!config) return false;
  try {
    const client = createClient(config.url, config.key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    return !error && data.user?.id === userId;
  } catch {
    return false;
  }
}
