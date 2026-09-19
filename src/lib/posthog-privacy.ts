import type { CaptureResult } from 'posthog-js';

import type { PostHogProperties } from '@/lib/posthog-events';

const LOCALE_PREFIX = /^\/(?:en|fr|es|de|it|ja|ko|zh)(?=\/|$)/i;
const MAX_STRING_LENGTH = 160;
const MAX_ROUTE_LENGTH = 160;
const URL_PROPERTIES = new Set([
  '$current_url',
  '$initial_current_url',
  '$referrer',
  '$initial_referrer',
  '$session_entry_url',
]);
const ROUTE_PROPERTIES = new Set(['$pathname', 'route', 'from_path', 'to_path']);
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

function sanitizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function redactText(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[redacted-email]')
    .replace(/([?&](?:token|access_token|refresh_token|code|email|password|secret)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\b((?:token|access_token|refresh_token|password|secret|authorization))\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .slice(0, MAX_STRING_LENGTH);
}

function normalizePathSegments(pathname: string): string {
  return pathname
    .replace(LOCALE_PREFIX, '')
    .replace(/(\/u\/)[^/]+(?=\/|$)/i, '$1[handle]')
    .replace(/(\/friends\/)[^/]+(?=\/|$)/i, '$1[friendId]')
    .replace(/(\/api\/auth\/)[^/]+(?=\/|$)/i, '$1[path]')
    .replace(/\/+/g, '/')
    .slice(0, MAX_ROUTE_LENGTH) || '/';
}

export function normalizePostHogRoute(value: string): string {
  try {
    const url = new URL(value, 'https://lunidex.app');
    return normalizePathSegments(url.pathname);
  } catch {
    return normalizePathSegments(value.split(/[?#]/, 1)[0] ?? value);
  }
}

export function sanitizePostHogUrl(value: string): string | null {
  try {
    const url = new URL(value, 'https://lunidex.app');
    url.search = '';
    url.hash = '';
    url.pathname = normalizePathSegments(url.pathname);
    return url.toString();
  } catch {
    return null;
  }
}

function sanitizeNumber(key: string, value: number): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  if (key === 'status') return Math.min(599, Math.max(100, Math.trunc(value)));
  if (key.endsWith('_ms') || key === 'count' || key.endsWith('_count')) {
    return Math.max(0, Math.min(1_000_000, Math.trunc(value)));
  }
  return value;
}

export function sanitizePostHogProperties(input: Record<string, unknown>): PostHogProperties {
  const result: PostHogProperties = {};

  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = sanitizeKey(rawKey);
    if (!key || SENSITIVE_KEYS.has(key)) continue;

    if (typeof rawValue === 'string') {
      if (URL_PROPERTIES.has(rawKey)) {
        const sanitizedUrl = sanitizePostHogUrl(rawValue);
        if (sanitizedUrl) result[rawKey] = sanitizedUrl;
        continue;
      }

      if (ROUTE_PROPERTIES.has(rawKey)) {
        result[rawKey] = normalizePostHogRoute(rawValue);
        continue;
      }

      result[rawKey] = redactText(rawValue);
      continue;
    }

    if (typeof rawValue === 'number') {
      const sanitizedNumber = sanitizeNumber(key, rawValue);
      if (sanitizedNumber !== undefined) result[rawKey] = sanitizedNumber;
      continue;
    }

    if (typeof rawValue === 'boolean' || rawValue === null) {
      result[rawKey] = rawValue;
    }
  }

  return result;
}

export function sanitizePostHogEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null;
  const properties = sanitizePostHogProperties(event.properties as Record<string, unknown>);
  // PostHog adds its project API key as `token` to the event envelope after
  // capture(). In this before_send hook it is an ingestion requirement, not a
  // user-provided property, so preserve only the SDK-provided value here.
  const sdkToken = (event.properties as Record<string, unknown> | undefined)?.token;
  if (typeof sdkToken === 'string' && sdkToken.length > 0) properties.token = sdkToken;
  const currentPath = typeof properties.$pathname === 'string'
    ? properties.$pathname
    : typeof properties.$current_url === 'string'
      ? normalizePostHogRoute(properties.$current_url)
      : undefined;

  if (currentPath && (currentPath === '/auth' || currentPath.startsWith('/auth/') || currentPath.startsWith('/api/'))) return null;
  return { ...event, properties };
}
