import { createNeonAuth } from '@neondatabase/auth/next/server';

type NeonAuthServer = ReturnType<typeof createNeonAuth>;
export type NeonAuthHandler = ReturnType<NeonAuthServer['handler']>;

let cachedAuth: NeonAuthServer | null = null;

/** Returns the request-aware Neon Auth server facade when configured. */
export function getNeonAuthServer(): NeonAuthServer | null {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !cookieSecret) return null;
  if (cachedAuth) return cachedAuth;

  cachedAuth = createNeonAuth({
    baseUrl,
    cookies: { secret: cookieSecret },
    logLevel: 'silent',
  });
  return cachedAuth;
}
