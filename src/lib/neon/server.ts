import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/**
 * The Vercel Neon integration exposes DATABASE_URL. NEON_DATABASE_URL remains
 * supported for local development and explicit server deployments.
 */
const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;

export type NeonSql = NeonQueryFunction<false, false>;

export const isNeonConfiguredServer = Boolean(connectionString);

let cachedSql: NeonSql | null = null;

/** Returns the server-only Neon HTTP query client, or null when unconfigured. */
export function getNeonClient(): NeonSql | null {
  if (!connectionString) return null;
  if (cachedSql) return cachedSql;

  cachedSql = neon(connectionString);
  return cachedSql;
}
