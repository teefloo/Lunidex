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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAllowedSupabaseUserId(
  userId: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const allowedUserId = env.SUPABASE_ALLOWED_USER_ID?.trim().toLowerCase();
  const normalizedUserId = userId.trim().toLowerCase();
  return Boolean(
    allowedUserId
      && UUID_PATTERN.test(allowedUserId)
      && UUID_PATTERN.test(normalizedUserId)
      && normalizedUserId === allowedUserId,
  );
}

/**
 * Temporary production access is fail-closed to one verified Auth identity.
 * The allowlist value is server-only and is never returned to the browser.
 */
export function isAllowedSupabaseAuthUser(
  user: Pick<User, 'id' | 'email' | 'email_confirmed_at'>,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const confirmedEmail = user.email?.trim();

  return Boolean(
    isAllowedSupabaseUserId(user.id, env)
      && confirmedEmail
      && user.email_confirmed_at?.trim(),
  );
}

export function resolveSupabaseAdminKey(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  if (secretKey) return secretKey;
  const legacyServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return legacyServiceRoleKey || null;
}

function getPublicConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

function mapAuthUser(user: User): SupabaseRequestUser | null {
  const email = user.email?.trim();
  if (!email || !isAllowedSupabaseAuthUser(user)) return null;
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

export type SupabaseRequestAuthResult =
  | { status: 'allowed'; user: SupabaseRequestUser }
  | { status: 'denied' }
  | { status: 'unavailable' };

export function isSupabaseAuthErrorUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { status?: unknown; code?: unknown; name?: unknown };
  const status = candidate.status;
  if (typeof status === 'number') {
    return [402, 408, 429, 500, 502, 503, 504].includes(status);
  }
  const code = typeof candidate.code === 'string' ? candidate.code.toLowerCase() : '';
  const name = typeof candidate.name === 'string' ? candidate.name.toLowerCase() : '';
  return code.includes('rate_limit')
    || code.includes('quota')
    || name.includes('fetch')
    || name.includes('retryable');
}

/** Verify either a bearer token or the incoming SSR cookie with Supabase Auth. */
export async function verifySupabaseUserFromRequest(request: Request): Promise<SupabaseRequestAuthResult> {
  const config = getPublicConfig();
  if (!config) return { status: 'unavailable' };

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
      if (!cookieClient) return { status: 'unavailable' };
      client = cookieClient;
    }

    const { data, error } = await client.auth.getUser(accessToken);
    if (error) return { status: isSupabaseAuthErrorUnavailable(error) ? 'unavailable' : 'denied' };
    if (!data.user) return { status: 'denied' };
    const user = mapAuthUser(data.user);
    return user ? { status: 'allowed', user } : { status: 'denied' };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function getSupabaseUserFromRequest(request: Request): Promise<SupabaseRequestUser | null> {
  const result = await verifySupabaseUserFromRequest(request);
  return result.status === 'allowed' ? result.user : null;
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

/** Admin operations stay server-only and prefer a secret key with legacy service-role fallback. */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const config = getPublicConfig();
  const adminKey = resolveSupabaseAdminKey();
  if (!config || !adminKey) return null;
  return createClient(config.url, adminKey, {
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
