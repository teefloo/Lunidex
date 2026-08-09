'use client';

import type { createAuthClient } from '@neondatabase/auth/next';

const NEON_AUTH_URL = process.env.NEXT_PUBLIC_NEON_AUTH_URL;

/** Whether the web build has been configured for Neon Auth. */
export const isNeonAuthConfigured = Boolean(NEON_AUTH_URL);

type NeonAuthClient = ReturnType<typeof createAuthClient>;

let cachedClient: NeonAuthClient | null = null;
let clientPromise: Promise<NeonAuthClient | null> | null = null;

/**
 * Returns the browser Neon Auth client. The Next.js SDK talks to the local
 * `/api/auth` proxy so session cookies stay on the Lunidex origin.
 */
export function getNeonAuthClient(): NeonAuthClient | null {
  if (!isNeonAuthConfigured) return null;
  return cachedClient;
}

/**
 * Loads the browser Neon Auth SDK only when authentication is actually needed.
 * Public pages keep the SDK out of the critical bundle and initialize it in idle time.
 */
export async function loadNeonAuthClient(): Promise<NeonAuthClient | null> {
  if (!isNeonAuthConfigured) return null;
  if (cachedClient) return cachedClient;
  if (clientPromise) return clientPromise;

  clientPromise = import('@neondatabase/auth/next')
    .then(({ createAuthClient }) => {
      cachedClient = createAuthClient();
      return cachedClient;
    })
    .catch(() => null);

  return clientPromise;
}

/** Returns the short-lived Neon JWT used by Lunidex API routes. */
export async function getNeonAccessToken(): Promise<string | null> {
  const client = await loadNeonAuthClient();
  if (!client) return null;

  try {
    const result = await client.token();
    return result.data?.token ?? null;
  } catch {
    return null;
  }
}
