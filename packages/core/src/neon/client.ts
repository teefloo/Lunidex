import { authStorage } from '../platform/neon-storage';
import { APP_API_URL, NEON_AUTH_URL } from '../platform/neon-env';

const AUTH_STORAGE_KEY = 'primedex-neon-auth-session';
const SESSION_COOKIE_NAME = '__Secure-neon-auth.session_token';

export interface NeonUser {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface NeonSession {
  user: NeonUser;
  expiresAt: string | null;
}

export interface NeonAuthError {
  name: string;
  message: string;
}

export interface NeonAuthResult {
  error: NeonAuthError | null;
}

interface StoredAuth {
  sessionToken: string;
  session: NeonSession;
}

interface JsonObject {
  [key: string]: unknown;
}

interface RequestResult {
  status: number;
  body: unknown;
}

const configuredAuthUrl = NEON_AUTH_URL?.replace(/\/$/, '') ?? '';
const configuredAppUrl = APP_API_URL.replace(/\/$/, '');

export const isNeonAuthConfigured = Boolean(configuredAuthUrl);

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unwrapBody(body: unknown): JsonObject {
  if (!isObject(body)) return {};
  return isObject(body.data) ? body.data : body;
}

function getErrorMessage(body: unknown, fallback: string): string {
  const record = unwrapBody(body);
  const error = isObject(record.error) ? record.error : record;
  return typeof error.message === 'string' ? error.message : fallback;
}

function parseUser(value: unknown): NeonUser | null {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.email !== 'string') return null;
  return {
    id: value.id,
    email: value.email,
    name: typeof value.name === 'string' ? value.name : 'Lunidex trainer',
    emailVerified: typeof value.emailVerified === 'boolean' ? value.emailVerified : undefined,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined,
  };
}

function parseSession(body: unknown, fallbackUser: NeonUser | null, fallbackExpiresAt: string | null): NeonSession | null {
  const record = unwrapBody(body);
  const user = parseUser(record.user) ?? fallbackUser;
  if (!user) return null;
  const session = isObject(record.session) ? record.session : {};
  const expiresAt = typeof session.expiresAt === 'string' ? session.expiresAt : fallbackExpiresAt;
  return { user, expiresAt };
}

function sessionCookie(token: string): string {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
}

async function readStoredAuth(): Promise<StoredAuth | null> {
  const raw = await authStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!isObject(value) || typeof value.sessionToken !== 'string') return null;
    const session = parseSession(value.session, null, null);
    return session ? { sessionToken: value.sessionToken, session } : null;
  } catch {
    return null;
  }
}

async function storeAuth(auth: StoredAuth): Promise<void> {
  await authStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

async function clearAuth(): Promise<void> {
  await authStorage.removeItem(AUTH_STORAGE_KEY);
}

async function request(path: string, init: RequestInit = {}, sessionToken?: string): Promise<RequestResult> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  if (configuredAppUrl && !headers.has('Origin')) headers.set('Origin', configuredAppUrl);
  if (sessionToken) headers.set('Cookie', sessionCookie(sessionToken));

  const response = await fetch(`${configuredAuthUrl}/${path.replace(/^\//, '')}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  const body = await response.json().catch(() => null) as unknown;
  return { status: response.status, body };
}

function resultFromFailure(result: RequestResult, fallback: string): NeonAuthResult {
  return {
    error: result.status >= 400
      ? { name: 'AuthError', message: getErrorMessage(result.body, fallback) }
      : null,
  };
}

type AuthListener = (session: NeonSession | null) => void;

class NeonAuthClient {
  private readonly listeners = new Set<AuthListener>();

  onAuthStateChange(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(session: NeonSession | null): void {
    for (const listener of this.listeners) listener(session);
  }

  async getSession(): Promise<NeonSession | null> {
    if (!isNeonAuthConfigured) return null;
    const stored = await readStoredAuth();
    if (!stored) return null;

    try {
      const result = await request('get-session', {}, stored.sessionToken);
      if (result.status === 401) {
        await clearAuth();
        return null;
      }
      if (result.status < 400) {
        const session = parseSession(result.body, stored.session.user, stored.session.expiresAt);
        if (session) {
          await storeAuth({ sessionToken: stored.sessionToken, session });
          return session;
        }
      }
    } catch {
      // Keep the locally persisted session available during a temporary outage.
    }

    return stored.session;
  }

  async getAccessToken(): Promise<string | null> {
    const stored = await readStoredAuth();
    if (!stored) return null;
    try {
      const result = await request('token', {}, stored.sessionToken);
      const token = unwrapBody(result.body).token;
      return result.status < 400 && typeof token === 'string' ? token : null;
    } catch {
      return null;
    }
  }

  async signUp(email: string, password: string, name: string): Promise<NeonAuthResult> {
    const result = await request('sign-up/email', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        name,
        callbackURL: configuredAppUrl || undefined,
      }),
    });
    if (result.status >= 400) return resultFromFailure(result, 'Unable to create the account.');
    await this.persistAuthResponse(result.body);
    return { error: null };
  }

  async signIn(email: string, password: string): Promise<NeonAuthResult> {
    const result = await request('sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password, callbackURL: configuredAppUrl || undefined }),
    });
    if (result.status >= 400) return resultFromFailure(result, 'Invalid email or password.');
    await this.persistAuthResponse(result.body);
    return { error: null };
  }

  async signOut(): Promise<void> {
    const stored = await readStoredAuth();
    if (stored) {
      try {
        await request('sign-out', { method: 'POST' }, stored.sessionToken);
      } catch {
        // Local logout still succeeds when the auth service is unreachable.
      }
    }
    await clearAuth();
    this.notify(null);
  }

  async requestPasswordReset(email: string): Promise<NeonAuthResult> {
    const result = await request('request-password-reset', {
      method: 'POST',
      body: JSON.stringify({
        email,
        redirectTo: configuredAppUrl ? `${configuredAppUrl}/auth/reset-password` : undefined,
      }),
    });
    return resultFromFailure(result, 'Unable to send the password reset email.');
  }

  async resetPassword(password: string, token: string): Promise<NeonAuthResult> {
    const result = await request('reset-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword: password, token }),
    });
    return resultFromFailure(result, 'Unable to update the password.');
  }

  async signInWithOAuth(_provider: 'google' | 'github'): Promise<NeonAuthResult> {
    void _provider;
    return {
      error: {
        name: 'NotSupported',
        message: 'OAuth sign-in from the mobile app requires a configured deep link.',
      },
    };
  }

  private async persistAuthResponse(body: unknown): Promise<void> {
    const record = unwrapBody(body);
    const token = typeof record.token === 'string' ? record.token : null;
    const user = parseUser(record.user);
    if (!token || !user) {
      this.notify(null);
      return;
    }
    const session = parseSession(body, user, null);
    if (!session) return;
    await storeAuth({ sessionToken: token, session });
    this.notify(session);
  }
}

let cachedClient: NeonAuthClient | null = null;

export function getNeonAuthClient(): NeonAuthClient {
  if (!cachedClient) cachedClient = new NeonAuthClient();
  return cachedClient;
}

export async function getNeonAccessToken(): Promise<string | null> {
  if (!isNeonAuthConfigured) return null;
  return getNeonAuthClient().getAccessToken();
}

/** Calls the deployed Neon-backed application API from native clients. */
export async function fetchAppApi(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = await getNeonAccessToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  const url = path.startsWith('http') ? path : `${configuredAppUrl}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, { ...init, headers });
}
