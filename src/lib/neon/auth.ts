import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { NeonSql } from './server';

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
    if (!store.has(NEON_AUTH_SESSION_COOKIE_NAME)) return null;

    const cookieHeader = store
      .getAll()
      .filter((cookie) => cookie.name.startsWith(NEON_AUTH_COOKIE_PREFIX))
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');

    const response = await fetch(new URL('get-session', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`), {
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
    if (!user?.id || !user.email) return null;
    return mapAuthUser(user);
  } catch {
    return null;
  }
}

/** Reads the request-aware Neon Auth cookie used by the Next.js integration. */
async function getNeonUserFromSession(): Promise<NeonRequestUser | null> {
  let getNeonAuthServer: typeof import('./server-auth').getNeonAuthServer;
  try {
    ({ getNeonAuthServer } = await import('./server-auth'));
  } catch {
    return null;
  }

  const auth = getNeonAuthServer();
  if (!auth) return null;

  try {
    const result = await auth.getSession();
    const user = result.data?.user;
    if (!user?.id || !user.email) return null;
    return mapAuthUser(user);
  } catch {
    return null;
  }
}

/** Verifies a Neon Auth JWT without trusting a client-supplied user id. */
export async function getNeonUserFromRequest(request: Request): Promise<NeonRequestUser | null> {
  const cookieUser = await getNeonUserFromSession();
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
 * initial copy. Credentials and sessions stay exclusively in Neon Auth.
 */
export async function ensureNeonUser(sql: NeonSql, user: NeonRequestUser): Promise<boolean> {
  await sql`
    insert into app.users (id)
    values (${user.id}::uuid)
    on conflict (id) do nothing
  `;

  const metadata = user.user_metadata;
  const rawName = typeof metadata.name === 'string'
    ? metadata.name
    : typeof metadata.display_name === 'string' ? metadata.display_name : null;
  const name = rawName?.trim().slice(0, 120) || null;
  const email = user.email.trim().slice(0, 320) || null;

  const profileRows = await sql`
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
  `;
  return Boolean(profileRows[0]);
}
