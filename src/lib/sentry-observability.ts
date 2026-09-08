import * as Sentry from '@sentry/nextjs';
import type { AxiosInstance } from 'axios';

export interface ObservabilityContext {
  feature: string;
  route?: string;
  operation?: string;
  method?: string;
  status?: number;
  service?: string;
  kind?: string;
}

export interface HttpFailureInput {
  error?: unknown;
  status?: number;
  operation?: string;
  emptyResult?: boolean;
}

export type FallbackKind =
  | 'stale-cache'
  | 'invalid-response'
  | 'incomplete-response'
  | 'empty-required-list'
  | 'sync-unavailable'
  | 'inconsistent-result';

type SanitizedContext = Record<string, string | number | boolean>;

const EXPECTED_HTTP_STATUSES = new Set([400, 401, 403, 404, 409]);
const MAX_DEDUPLICATION_KEYS = 256;
const MAX_VALUE_LENGTH = 80;
const deduplicationKeys = new Set<string>();
const instrumentedAxiosClients = new WeakSet<AxiosInstance>();

const SENSITIVE_KEYS = new Set([
  'authorization',
  'body',
  'cookie',
  'data',
  'displayname',
  'email',
  'headers',
  'handle',
  'ip',
  'ipaddress',
  'first_name',
  'firstname',
  'lastname',
  'last_name',
  'name',
  'password',
  'payload',
  'phone',
  'profile',
  'query',
  'request',
  'response',
  'secret',
  'session',
  'token',
  'user',
  'userid',
  'user_id',
  'username',
]);

function clampValue(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[redacted-email]')
    .replace(/([?&](?:token|access_token|refresh_token|code|email|password|secret)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\b((?:token|access_token|refresh_token|password|secret|authorization))\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .slice(0, MAX_VALUE_LENGTH);
}

function normalizePathSegment(previous: string | undefined, segment: string): string {
  if (!previous) return segment;

  if (previous === 'pokemon' || previous === 'pokemon-species' || previous === 'pokemon-form') {
    return ':name';
  }

  if (previous === 'cards' || previous === 'sets' || previous === 'collection' || previous === 'u') {
    return ':id';
  }

  if (previous === 'moves' || previous === 'abilities' || previous === 'items' || previous === 'types') {
    return ':name';
  }

  if (previous === 'friends' || previous === 'battle' || previous === 'rooms') {
    return ':id';
  }

  return segment;
}

/** Normalizes a local or external URL into a low-cardinality pathname. */
export function normalizeSentryRoute(value: string | undefined): string | undefined {
  if (!value) return undefined;

  let pathname = value;
  try {
    pathname = new URL(value, 'https://lunidex.app').pathname;
  } catch {
    pathname = value.split(/[?#]/, 1)[0] ?? value;
  }

  const withoutLocale = pathname.replace(/^\/(?:en|fr|es|de|it|ja|ko|zh)(?=\/|$)/i, '');
  const segments = withoutLocale
    .split('/')
    .filter(Boolean)
    .map((segment, index, all) => normalizePathSegment(all[index - 1], segment));

  return `/${segments.join('/')}`.replace(/\/+/g, '/') || '/';
}

function sanitizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/** Keeps only the small, non-sensitive context allowlist accepted by Sentry. */
export function sanitizeSentryContext(input: unknown): SanitizedContext {
  if (!input || typeof input !== 'object') return {};

  const result: SanitizedContext = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = sanitizeKey(rawKey);
    if (SENSITIVE_KEYS.has(key) || !isPrimitive(rawValue)) continue;
    if (key === 'route') {
      const route = normalizeSentryRoute(String(rawValue));
      if (route) result.route = route;
      continue;
    }
    if (key === 'method') {
      result.method = clampValue(String(rawValue).toUpperCase());
      continue;
    }
    if (key === 'status' && typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      result.status = Math.trunc(rawValue);
      continue;
    }
    result[key] = typeof rawValue === 'string' ? clampValue(rawValue) : rawValue;
  }

  return result;
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; code?: unknown; __CANCEL__?: unknown };
  return candidate.name === 'AbortError'
    || candidate.code === 'ERR_CANCELED'
    || candidate.__CANCEL__ === true;
}

export function shouldIgnoreHttpFailure(input: HttpFailureInput): boolean {
  if (input.emptyResult && input.operation?.toLowerCase().includes('search')) return true;
  if (isAbortError(input.error)) return true;
  return typeof input.status === 'number' && EXPECTED_HTTP_STATUSES.has(input.status);
}

function getDeduplicationKey(kind: string, message: string, context: SanitizedContext): string {
  return JSON.stringify([kind, message, context.feature, context.route, context.operation, context.status]);
}

function isDuplicate(key: string): boolean {
  if (deduplicationKeys.has(key)) return true;
  deduplicationKeys.add(key);
  if (deduplicationKeys.size > MAX_DEDUPLICATION_KEYS) {
    const oldest = deduplicationKeys.values().next().value;
    if (typeof oldest === 'string') deduplicationKeys.delete(oldest);
  }
  return false;
}

function withObservabilityScope(context: SanitizedContext, callback: () => void): void {
  try {
    Sentry.withScope((scope) => {
      if (context.feature) scope.setTag('feature', context.feature);
      if (context.route) scope.setTag('route', context.route);
      if (context.status !== undefined) scope.setTag('status', String(context.status));
      scope.setContext('observability', context);
      callback();
    });
  } catch {
    // Reporting must never change application behavior.
  }
}

function createSafeException(error: unknown): Error {
  if (!(error instanceof Error)) return new Error('Observed exception');

  const safeError = new Error(clampValue(error.message || 'Observed exception'));
  safeError.name = clampValue(error.name || 'Error');
  if (typeof error.stack === 'string') {
    safeError.stack = error.stack
      .split('\n')
      .map((line) => clampValue(line))
      .join('\n')
      .slice(0, 4000);
  }
  return safeError;
}

export function reportSentryException(error: unknown, context: ObservabilityContext): void {
  const sanitizedContext = sanitizeSentryContext(context);
  const safeError = createSafeException(error);
  const key = getDeduplicationKey(`exception:${safeError.name}`, safeError.message, sanitizedContext);
  if (isDuplicate(key)) return;

  withObservabilityScope(sanitizedContext, () => {
    Sentry.captureException(safeError);
  });
}

export function reportSentryMessage(
  message: string,
  context: ObservabilityContext,
  level: Sentry.SeverityLevel = 'error',
): void {
  const sanitizedContext = sanitizeSentryContext(context);
  const sanitizedMessage = clampValue(message);
  const key = getDeduplicationKey(`message:${level}`, sanitizedMessage, sanitizedContext);
  if (isDuplicate(key)) return;

  withObservabilityScope(sanitizedContext, () => {
    Sentry.captureMessage(sanitizedMessage, level);
  });
}

export function reportHttpFailure(
  error: unknown,
  context: ObservabilityContext & { status?: number; operation?: string },
): void {
  if (shouldIgnoreHttpFailure({ error, status: context.status, operation: context.operation })) return;
  const candidate = error && typeof error === 'object' ? error as { name?: unknown; code?: unknown } : {};
  const errorName = typeof candidate.name === 'string' ? clampValue(candidate.name) : 'Error';
  const errorCode = typeof candidate.code === 'string' ? clampValue(candidate.code) : undefined;
  const safeError = new Error(`Observed ${errorName}${errorCode ? ` (${errorCode})` : ''} failure`);
  safeError.name = 'ObservedHttpFailure';
  reportSentryException(safeError, { ...context, kind: 'http-failure' });
}

export function reportFallback(kind: FallbackKind, context: ObservabilityContext): void {
  reportSentryMessage(`Lunidex fallback: ${kind}`, { ...context, kind: 'fallback' }, 'warning');
}

/**
 * Give serverless and Edge runtimes a bounded opportunity to deliver events
 * before a route response completes. Client-side callers do not need this;
 * their transport stays alive independently of the request lifecycle.
 */
export async function flushSentryEvents(timeout = 1500): Promise<void> {
  try {
    if (!Sentry.getClient()) return;
    await Sentry.flush(timeout);
  } catch {
    // Reporting must never change application behavior.
  }
}

export function attachAxiosSentryInstrumentation(
  client: AxiosInstance,
  context: { feature: string; service: string },
): void {
  if (instrumentedAxiosClients.has(client)) return;
  instrumentedAxiosClients.add(client);

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const candidate = error && typeof error === 'object'
        ? error as {
          response?: { status?: unknown };
          config?: { baseURL?: unknown; url?: unknown; method?: unknown };
        }
        : {};
      const config = candidate.config;
      const baseUrl = typeof config?.baseURL === 'string' ? config.baseURL : '';
      const requestUrl = typeof config?.url === 'string' ? config.url : undefined;
      const method = typeof config?.method === 'string' ? config.method.toUpperCase() : undefined;
      const status = typeof candidate.response?.status === 'number' ? candidate.response.status : undefined;

      reportHttpFailure(error, {
        feature: context.feature,
        service: context.service,
        route: requestUrl ? `${baseUrl}${requestUrl}` : undefined,
        method,
        status,
      });

      return Promise.reject(error);
    },
  );
}

export function featureFromQueryKey(queryKey: readonly unknown[]): string {
  const candidate = typeof queryKey[0] === 'string' ? queryKey[0].toLowerCase() : '';
  const features = [
    'pokemon',
    'profile',
    'quiz',
    'friends',
    'battle',
    'tcg',
    'price',
    'notifications',
    'notification',
    'sync',
    'smogon',
  ];
  return features.find((feature) => candidate.includes(feature)) ?? 'query';
}

export function featureFromCacheKey(cacheKey: string): string {
  const candidate = cacheKey.toLowerCase();
  const features = ['pokemon', 'move', 'ability', 'item', 'tcg', 'collection', 'graphql'];
  return features.find((feature) => candidate.includes(feature)) ?? 'cache';
}

export function resetSentryDeduplicationForTests(): void {
  deduplicationKeys.clear();
}
