'use client';

import { getNeonAccessToken } from '@/lib/neon/client';
import { reportHttpFailure, type ObservabilityContext } from '@/lib/sentry-observability';

/** Returns the current Neon Auth JWT for server-side application API calls. */
export async function getAppAccessToken(): Promise<string | null> {
  return getNeonAccessToken();
}

/**
 * Calls an application API route and forwards the Neon Auth JWT. Database
 * credentials never enter this browser-side helper or the client bundle.
 */
export async function fetchAppApi(
  input: RequestInfo | URL,
  init: RequestInit = {},
  observability: Partial<Pick<ObservabilityContext, 'feature' | 'operation'>> = {},
): Promise<Response> {
  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const route = requestUrl.split(/[?#]/, 1)[0] ?? requestUrl;
  const feature = observability.feature ?? route.split('/').filter(Boolean)[1] ?? 'application-api';
  const method = (init.method ?? 'GET').toUpperCase();

  try {
    const headers = new Headers(init.headers);
    const token = await getAppAccessToken();
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(input, { ...init, headers });
    if (response.status >= 500) {
      reportHttpFailure(new Error('Application API request failed'), {
        feature,
        route,
        method,
        status: response.status,
        operation: observability.operation,
      });
    }
    return response;
  } catch (error) {
    reportHttpFailure(error, {
      feature,
      route,
      method,
      operation: observability.operation,
    });
    throw error;
  }
}
