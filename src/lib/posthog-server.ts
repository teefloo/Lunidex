import {
  getProductMeasurementConsentFromCookie,
  type ProductMeasurementConsent,
} from '@/lib/posthog-consent';
import { normalizePostHogRoute, sanitizePostHogProperties } from '@/lib/posthog-privacy';

const POSTHOG_PROJECT_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
const POSTHOG_ENABLED = process.env.NEXT_PUBLIC_POSTHOG_ENABLED === 'true';
const POSTHOG_ENVIRONMENT = process.env.NEXT_PUBLIC_POSTHOG_ENVIRONMENT
  || process.env.VERCEL_ENV
  || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
const POSTHOG_RELEASE = process.env.NEXT_PUBLIC_APP_RELEASE
  || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  || 'local';
const MAX_DEDUPLICATION_KEYS = 256;
const deduplicationKeys = new Set<string>();

export interface PostHogServerErrorContext {
  feature: string;
  route?: string;
  operation?: string;
  method?: string;
  status?: number;
  request?: unknown;
  routerKind?: string;
  routeType?: string;
  renderSource?: string;
}

interface RequestLike {
  url?: string;
  method?: string;
  headers?: Headers | Record<string, string | string[] | undefined> | { get?: (name: string) => string | null };
}

function isConfigured(): boolean {
  return Boolean(POSTHOG_ENABLED && POSTHOG_PROJECT_TOKEN);
}

function asRequestLike(request: unknown): RequestLike | undefined {
  if (!request || typeof request !== 'object') return undefined;
  return request as RequestLike;
}

function getHeader(request: RequestLike | undefined, name: string): string | undefined {
  const headers = request?.headers;
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    const value = headers.get(name);
    return value?.trim() || undefined;
  }
  const value = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  if (Array.isArray(value)) return value[0]?.trim() || undefined;
  return value?.trim() || undefined;
}

function getCookieHeader(request: RequestLike | undefined): string | undefined {
  return getHeader(request, 'cookie');
}

function getDistinctId(request: RequestLike | undefined): string {
  const candidate = getHeader(request, 'x-posthog-distinct-id');
  if (candidate && /^[A-Za-z0-9._:-]{1,128}$/.test(candidate)) return candidate;
  return `server:${POSTHOG_ENVIRONMENT}`;
}

function safeError(error: unknown): Error {
  const candidate = error instanceof Error ? error : new Error('Observed server exception');
  const sanitized = sanitizePostHogProperties({
    message: candidate.message,
    name: candidate.name,
    stack: candidate.stack,
  });
  const result = new Error(typeof sanitized.message === 'string' ? sanitized.message : 'Observed server exception');
  result.name = typeof sanitized.name === 'string' ? sanitized.name : 'Error';
  if (typeof sanitized.stack === 'string') result.stack = sanitized.stack.slice(0, 4000);
  return result;
}

function shouldDeduplicate(key: string): boolean {
  if (deduplicationKeys.has(key)) return true;
  deduplicationKeys.add(key);
  if (deduplicationKeys.size > MAX_DEDUPLICATION_KEYS) {
    const oldest = deduplicationKeys.values().next().value;
    if (typeof oldest === 'string') deduplicationKeys.delete(oldest);
  }
  return false;
}

function consentFromRequest(request: RequestLike | undefined): ProductMeasurementConsent {
  return getProductMeasurementConsentFromCookie(getCookieHeader(request));
}

export async function capturePostHogServerException(
  error: unknown,
  context: PostHogServerErrorContext,
): Promise<void> {
  const request = asRequestLike(context.request);
  if (!isConfigured() || consentFromRequest(request) !== 'granted') return;
  if (process.env.NEXT_RUNTIME === 'edge' || process.env.NEXT_RUNTIME === 'workerd') return;

  const route = context.route ? normalizePostHogRoute(context.route) : undefined;
  const method = context.method || request?.method;
  const key = JSON.stringify([
    context.feature,
    route,
    context.operation,
    method,
    context.status,
    error instanceof Error ? error.name : 'Error',
  ]);
  if (shouldDeduplicate(key)) return;

  try {
    const { PostHog } = await import('posthog-node');
    const client = new PostHog(POSTHOG_PROJECT_TOKEN as string, {
      host: POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
    const properties = sanitizePostHogProperties({
      app_environment: POSTHOG_ENVIRONMENT,
      app_release: POSTHOG_RELEASE,
      feature: context.feature,
      route,
      operation: context.operation,
      method,
      status: context.status,
      router_kind: context.routerKind,
      route_type: context.routeType,
      render_source: context.renderSource,
      $session_id: getHeader(request, 'x-posthog-session-id'),
      $window_id: getHeader(request, 'x-posthog-window-id'),
    });
    client.captureException(safeError(error), getDistinctId(request), properties);
    await client.shutdown(1500);
  } catch {
    // Analytics must never alter a response or obscure the original error.
  }
}

export function resetPostHogServerDeduplicationForTests(): void {
  deduplicationKeys.clear();
}
