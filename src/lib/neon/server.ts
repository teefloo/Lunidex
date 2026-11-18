import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/** Server-only Neon connection configured for the Lunidex runtime. */
const connectionString = process.env.NEON_DATABASE_URL;

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
