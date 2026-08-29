import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { NeonSql } from './server';
import {
  DEVELOPMENT_AUTH_COOKIE_PREFIX,
  hasDevelopmentAuthCookie,
  rewriteDevelopmentAuthCookieHeader,
} from './local-cookies';

export interface NeonRequestUser {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
    display_name?: string;
  };
}

const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
const remoteJwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;
const expectedIssuer = process.env.NEON_AUTH_JWT_ISSUER;
const expectedAudience = process.env.NEON_AUTH_JWT_AUDIENCE;

function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1] ?? null;
}

function mapAuthUser(user: {
  id: string;
  email: string;
  name?: string | null;
}): NeonRequestUser {
  const name = user.name?.trim() ?? '';
  return {
    id: user.id,
    email: user.email,
    user_metadata: name ? { name, display_name: name } : {},
  };
}

const NEON_AUTH_COOKIE_PREFIX = '__Secure-neon-auth';
const NEON_AUTH_SESSION_COOKIE_NAME = `${NEON_AUTH_COOKIE_PREFIX}.session_token`;
const DEVELOPMENT_AUTH_SESSION_COOKIE_NAME = `${DEVELOPMENT_AUTH_COOKIE_PREFIX}.session_token`;

async function getUserFromCookieHeader(
  cookieHeader: string,
  baseUrl: string,
): Promise<NeonRequestUser | null> {
  const sessionUrl = new URL('get-session', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  sessionUrl.searchParams.set('disableCookieCache', 'true');
  const response = await fetch(sessionUrl, {
    method: 'GET',
    headers: {
      Cookie: cookieHeader,
      Accept: 'application/json',
      'x-neon-auth-proxy': 'nextjs',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(3_000),
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    user?: { id: string; email: string; name?: string | null };
  };
  const user = payload.user;
  return user?.id && user.email ? mapAuthUser(user) : null;
}

/**
 * Reads the signed-in state for first paint without mutating cookies.
 *
 * The package's auth.getSession() fast path is safe, but its upstream
 * fallback writes the session-data cookie through Next's cookie store, which
 * throws outside a Server Action or Route Handler. This read-only request
 * performs the same upstream `/get-session` call the client-facing
 * `/api/auth/get-session` handler makes, so the server answer always matches
 * the client answer. It never writes cookies and returns null for anonymous
 * visitors without a network request.
 */
export async function getServerAuthUser(): Promise<NeonRequestUser | null> {
  let getNeonAuthServer: typeof import('./server-auth').getNeonAuthServer;
  let cookies: typeof import('next/headers').cookies;
  try {
    ({ getNeonAuthServer } = await import('./server-auth'));
    ({ cookies } = await import('next/headers'));
  } catch {
    return null;
  }

  const auth = getNeonAuthServer();
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!auth || !baseUrl) return null;

  try {
    const store = await cookies();
    const authCookies = store
      .getAll()
      .filter((cookie) => cookie.name.startsWith(NEON_AUTH_COOKIE_PREFIX)
        || (process.env.NODE_ENV === 'development' && cookie.name.startsWith(DEVELOPMENT_AUTH_COOKIE_PREFIX)));
    if (!authCookies.some((cookie) => cookie.name === NEON_AUTH_SESSION_COOKIE_NAME
      || cookie.name === DEVELOPMENT_AUTH_SESSION_COOKIE_NAME)) return null;

    const cookieHeader = authCookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');
    return getUserFromCookieHeader(rewriteDevelopmentAuthCookieHeader(cookieHeader), baseUrl);
  } catch {
    return null;
  }
}

/** Reads the request-aware Neon Auth cookie used by the Next.js integration. */
async function getNeonUserFromSession(request?: Request): Promise<NeonRequestUser | null> {
  const requestCookieHeader = request?.headers.get('cookie');
  if (process.env.NODE_ENV === 'development'
    && requestCookieHeader
    && hasDevelopmentAuthCookie(requestCookieHeader)) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    if (!baseUrl) return null;
    try {
      return await getUserFromCookieHeader(
        rewriteDevelopmentAuthCookieHeader(requestCookieHeader),
        baseUrl,
      );
    } catch {
      return null;
    }
  }

  let getNeonAuthServer: typeof import('./server-auth').getNeonAuthServer;
  try {
    ({ getNeonAuthServer } = await import('./server-auth'));
  } catch {
    return null;
  }

  const auth = getNeonAuthServer();
  if (!auth) return null;

  try {
    // Protected application routes must revalidate upstream. The signed
    // session-data cookie is an optimization for ordinary proxy traffic, not
    // an authorization source after logout or revocation.
    const result = await auth.getSession({ query: { disableCookieCache: true } });
    const user = result.data?.user;
    if (!user?.id || !user.email) return null;
    return mapAuthUser(user);
  } catch {
    return null;
  }
}

/** Verifies a Neon Auth JWT without trusting a client-supplied user id. */
export async function getNeonUserFromRequest(request: Request): Promise<NeonRequestUser | null> {
  const cookieUser = await getNeonUserFromSession(request);
  if (cookieUser) return cookieUser;

  if (!remoteJwks) return null;
  const token = bearerToken(request.headers.get('authorization'));
  if (!token) return null;

  try {
    // Copy the exact claims from the Neon Auth configuration in production.
    // Conditional options preserve local setups until those values are known,
    // while enforcing the issuer/audience contract once configured.
    const { payload } = await jwtVerify(token, remoteJwks, {
      ...(expectedIssuer ? { issuer: expectedIssuer } : {}),
      ...(expectedAudience ? { audience: expectedAudience } : {}),
    });
    const id = typeof payload.sub === 'string'
      ? payload.sub
      : typeof payload.id === 'string' ? payload.id : null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    if (!id || !email) return null;

    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    return mapAuthUser({ id, email, name });
  } catch {
    return null;
  }
}

/**
 * Creates the Neon-side identity projection lazily for users created after the
 * initial copy. Credentials and sessions stay exclusively in Neon Auth. This
 * is also the authoritative account-lifecycle gate, so it must re-read the
 * deletion tombstone for every request instead of using a process-local cache.
 */
export async function ensureNeonUser(sql: NeonSql, user: NeonRequestUser): Promise<boolean> {
  const metadata = user.user_metadata;
  const rawName = typeof metadata.name === 'string'
    ? metadata.name
    : typeof metadata.display_name === 'string' ? metadata.display_name : null;
  const name = rawName?.trim().slice(0, 120) || null;
  const email = user.email.trim().slice(0, 320) || null;

  interface AccountStateRow {
    deletion_state: 'active' | 'pending' | 'deleted';
  }

  const [, stateRows, profileRows] = await sql.transaction((tx) => [
    tx`
      insert into app.users (id)
      values (${user.id}::uuid)
      on conflict (id) do nothing
    `,
    tx`
      select deletion_state
      from app.users
      where id = ${user.id}::uuid
      for update
    `,
    tx`
      insert into public.profiles (id, name, email)
      select ${user.id}::uuid, ${name}, ${email}
      from app.users
      where id = ${user.id}::uuid
        and deletion_state = 'active'
      on conflict (id) do update set
        name = coalesce(excluded.name, public.profiles.name),
        email = coalesce(excluded.email, public.profiles.email),
        updated_at = now()
      returning id
    `,
  ]) as [unknown[], AccountStateRow[], Array<{ id: string }>];

  const isActive = stateRows[0]?.deletion_state === 'active' && Boolean(profileRows[0]);
  return isActive;
}
