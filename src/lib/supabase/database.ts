import 'server-only';

import { Pool, type PoolClient, type QueryResultRow } from 'pg';

type SqlRows = QueryResultRow[];
type SqlTag = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<SqlRows>) & {
  query(text: string, values?: unknown[]): Promise<SqlRows>;
};

export interface SupabaseSql extends SqlTag {
  transaction<T extends readonly Promise<unknown>[]>(
    callback: (transactionSql: SqlTag) => T,
    options?: { isolationLevel?: 'Read Committed' | 'Repeatable Read' | 'Serializable' },
  ): Promise<{ [K in keyof T]: Awaited<T[K]> }>;
}

declare global {
  var __lunidexSupabasePool: Pool | undefined;
}

function getPool(): Pool | null {
  const connectionString = process.env.SUPABASE_DATABASE_URL;
  if (!connectionString) return null;
  if (globalThis.__lunidexSupabasePool) return globalThis.__lunidexSupabasePool;

  const configuredMax = Number.parseInt(process.env.SUPABASE_DB_POOL_MAX ?? '5', 10);
  const max = Number.isInteger(configuredMax) ? Math.min(Math.max(configuredMax, 1), 10) : 5;
  const pool = new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    keepAlive: true,
    // Verify the Supabase pooler's TLS certificate using Node's system trust
    // store. Do not accept self-signed/invalid certificates in production.
    ssl: true,
    application_name: 'lunidex-web',
  });
  pool.on('error', () => {
    // An idle connection can fail after pooler maintenance; the next checkout
    // will create a replacement. Never log connection details or credentials.
  });
  globalThis.__lunidexSupabasePool = pool;
  return pool;
}

function makeTag(query: (text: string, values: unknown[]) => Promise<{ rows: SqlRows }>): SqlTag {
  const tag = (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0] ?? '';
    for (let index = 0; index < values.length; index += 1) {
      text += `$${index + 1}${strings[index + 1] ?? ''}`;
    }
    return query(text, values).then((result) => result.rows);
  };
  return Object.assign(tag, {
    query: (text: string, values: unknown[] = []) => query(text, values).then((result) => result.rows),
  });
}

function makeTransactionTag(client: PoolClient): SqlTag {
  return makeTag((text, values) => client.query(text, values));
}

let cachedClient: SupabaseSql | null = null;

/** Returns the server-only Supabase PostgreSQL adapter or null when unconfigured. */
export function getSupabaseDatabaseClient(): SupabaseSql | null {
  const pool = getPool();
  if (!pool) return null;
  if (cachedClient) return cachedClient;

  const queryTag = makeTag((text, values) => pool.query(text, values));
  const client: SupabaseSql = Object.assign(queryTag, {
    async transaction<T extends readonly Promise<unknown>[]>(
      callback: (transactionSql: SqlTag) => T,
      options?: { isolationLevel?: 'Read Committed' | 'Repeatable Read' | 'Serializable' },
    ): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
      const transactionClient = await pool.connect();
      try {
        const isolationLevel = options?.isolationLevel;
        await transactionClient.query(isolationLevel ? `BEGIN ISOLATION LEVEL ${isolationLevel.toUpperCase()}` : 'BEGIN');
        const pending = callback(makeTransactionTag(transactionClient));
        const results = await Promise.all(pending);
        await transactionClient.query('COMMIT');
        return results as { [K in keyof T]: Awaited<T[K]> };
      } catch (error) {
        await transactionClient.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        transactionClient.release();
      }
    },
  });
  cachedClient = client;
  return client;
}

export const isSupabaseConfiguredServer = Boolean(process.env.SUPABASE_DATABASE_URL);
