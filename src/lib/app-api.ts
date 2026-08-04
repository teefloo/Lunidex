'use client';

import { getNeonAccessToken } from '@/lib/neon/client';

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
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = await getAppAccessToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}
