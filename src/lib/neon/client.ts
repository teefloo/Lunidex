'use client';

import { createAuthClient } from '@neondatabase/auth/next';

const NEON_AUTH_URL = process.env.NEXT_PUBLIC_NEON_AUTH_URL;

/** Whether the web build has been configured for Neon Auth. */
export const isNeonAuthConfigured = Boolean(NEON_AUTH_URL);

type NeonAuthClient = ReturnType<typeof createAuthClient>;

let cachedClient: NeonAuthClient | null = null;

/**
 * Returns the browser Neon Auth client. The Next.js SDK talks to the local
 * `/api/auth` proxy so session cookies stay on the Lunidex origin.
 */
export function getNeonAuthClient(): NeonAuthClient | null {
  if (!isNeonAuthConfigured) return null;
  if (cachedClient) return cachedClient;

  cachedClient = createAuthClient();
  return cachedClient;
}

/** Returns the short-lived Neon JWT used by Lunidex API routes. */
export async function getNeonAccessToken(): Promise<string | null> {
  const client = getNeonAuthClient();
  if (!client) return null;

  try {
    const result = await client.token();
    return result.data?.token ?? null;
  } catch {
    return null;
  }
}
