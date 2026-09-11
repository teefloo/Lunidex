import { createNeonAuth } from '@neondatabase/auth/next/server';
import {
  DEVELOPMENT_AUTH_COOKIE_PREFIX,
  rewriteDevelopmentAuthRequest,
} from './local-cookies';

type NeonAuthServer = ReturnType<typeof createNeonAuth>;
export type NeonAuthHandler = ReturnType<NeonAuthServer['handler']>;

export interface NeonAuthDeletionResult {
  success: boolean;
  response: Response;
}

export interface NeonAuthRevocationResult {
  attempted: boolean;
  success: boolean;
}

const NEON_AUTH_SESSION_COOKIE_NAME = '__Secure-neon-auth.session_token';
const DEVELOPMENT_AUTH_SESSION_COOKIE_NAME = `${DEVELOPMENT_AUTH_COOKIE_PREFIX}.session_token`;

function decodeCookieValue(value: string): string {
  const unquoted = value.length >= 2 && value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1)
    : value;
  if (!unquoted.includes('%')) return unquoted;
  try {
    return decodeURIComponent(unquoted);
  } catch {
    return unquoted;
  }
}

/** Extracts only the current Neon Auth session token from an incoming cookie header. */
export function extractNeonAuthSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = new Map<string, string>();
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    const value = decodeCookieValue(part.slice(separator + 1).trim());
    if (value) cookies.set(name, value);
  }

  return cookies.get(NEON_AUTH_SESSION_COOKIE_NAME)
    ?? (process.env.NODE_ENV === 'development'
      ? cookies.get(DEVELOPMENT_AUTH_SESSION_COOKIE_NAME)
      : undefined)
    ?? null;
}

let cachedAuth: NeonAuthServer | null = null;

/** Returns the request-aware Neon Auth server facade when configured. */
export function getNeonAuthServer(): NeonAuthServer | null {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !cookieSecret) return null;
  if (cachedAuth) return cachedAuth;

  cachedAuth = createNeonAuth({
    baseUrl,
    cookies: { secret: cookieSecret, sameSite: 'strict' },
    logLevel: 'silent',
  });
  return cachedAuth;
}

/**
 * Revokes the exact browser session before the normal sign-out proxy clears
 * its cookies. The provider endpoint is deliberately used instead of the
 * cached session facade, so a successful response means the token no longer
 * authorizes protected requests upstream.
 */
export async function revokeNeonAuthSession(request: Request): Promise<NeonAuthRevocationResult> {
  const token = extractNeonAuthSessionToken(request.headers.get('cookie'));
  if (!token) return { attempted: false, success: true };

  const auth = getNeonAuthServer();
  if (!auth) return { attempted: true, success: false };

  try {
    const headers = new Headers(request.headers);
    headers.set('Content-Type', 'application/json');
    headers.delete('Content-Length');
    const revokeRequest = rewriteDevelopmentAuthRequest(new Request(request.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token }),
    }));
    const response = await auth.handler().POST(revokeRequest, {
      params: Promise.resolve({ path: ['revoke-session'] }),
    });
    const payload = await response.clone().json().catch(() => null) as unknown;
    const status = typeof payload === 'object'
      && payload !== null
      && 'status' in payload
      && (payload as { status?: unknown }).status === true;
    return { attempted: true, success: response.ok && status };
  } catch {
    return { attempted: true, success: false };
  }
}

/**
 * Proxies account deletion with the request's original cookies or bearer
 * token. Calling the server facade method directly only reads Next's cookie
 * store, which would make native bearer-token deletion fail unexpectedly.
 */
export async function deleteNeonAuthUser(
  request: Request,
  password?: string,
): Promise<NeonAuthDeletionResult | null> {
  const auth = getNeonAuthServer();
  if (!auth) return null;

  const headers = new Headers(request.headers);
  headers.set('Content-Type', 'application/json');
  headers.delete('Content-Length');
  const body = password ? { password } : {};
  const authRequest = new Request(request.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const response = await auth.handler().POST(authRequest, {
    params: Promise.resolve({ path: ['delete-user'] }),
  });
  const payload = await response.clone().json().catch(() => null) as unknown;
  const success = typeof payload === 'object'
    && payload !== null
    && 'success' in payload
    && (payload as { success?: unknown }).success === true;
  return { success: response.ok && success, response };
}
