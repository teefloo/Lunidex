import { createNeonAuth } from '@neondatabase/auth/next/server';

type NeonAuthServer = ReturnType<typeof createNeonAuth>;
export type NeonAuthHandler = ReturnType<NeonAuthServer['handler']>;

export interface NeonAuthDeletionResult {
  success: boolean;
  response: Response;
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
