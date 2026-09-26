import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getNeonClient, type NeonSql } from '@/lib/neon/server';
import { getNeonUserFromRequest, ensureNeonUser } from '@/lib/neon/auth';
import { isInactiveAccountError } from '@/lib/neon/errors';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import { readJsonBody } from '@/lib/api/route-helpers';

export type ApiPermission = 'read' | 'read_write';
export type ApiOperation = 'read' | 'write';
export type ApiCostClass = 'cards' | 'sealed' | undefined;

export interface PublicApiContext {
  sql: NeonSql;
  userId: string;
  keyId: string;
  permission: ApiPermission;
}

interface ApiKeyRow {
  id: string;
  user_id: string;
  key_hash: string;
  permission: ApiPermission;
  deletion_state: 'active' | 'pending' | 'deleted';
}

interface QuotaReservation {
  subject_key: string;
  bucket_type: string;
  window_start: string;
  limit_count: number;
}

interface QuotaResult {
  allowed: boolean;
  blocked: Array<{ bucket: string; resetAt: string }>;
}

export class ApiAccountUnavailableError extends Error {
  constructor() {
    super('The account is being deleted.');
    this.name = 'ApiAccountUnavailableError';
  }
}

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const KEY_PATTERN = /^lxd_v1_([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function apiResponse<T>(data: T, status = 200, meta?: unknown): NextResponse {
  return NextResponse.json(meta === undefined ? { data } : { data, meta }, { status, headers: NO_STORE });
}

export function apiError(
  status: number,
  code: string,
  message: string,
  options: { details?: unknown; headers?: HeadersInit } = {},
): NextResponse {
  const headers = new Headers(NO_STORE);
  new Headers(options.headers).forEach((value, key) => headers.set(key, value));
  const error = options.details === undefined
    ? { code, message }
    : { code, message, details: options.details };
  return NextResponse.json({ error }, { status, headers });
}

export function isApiContext(value: PublicApiContext | NextResponse): value is PublicApiContext {
  return 'sql' in value;
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function hashRequestBody(value: unknown): string {
  return sha256(canonicalJson(value));
}

export function createApiKeyMaterial(): { id: string; token: string; hash: string; prefix: string } {
  const id = randomUUID();
  const prefix = `lxd_v1_${id}`;
  const token = `${prefix}.${randomBytes(32).toString('base64url')}`;
  return { id, token, hash: sha256(token), prefix };
}

export async function readJsonObject<T extends Record<string, unknown>>(
  request: NextRequest,
  maxBytes = 16 * 1024,
): Promise<T | null> {
  return readJsonBody<T>(request, { maxBytes });
}

export async function authenticateApiKey(
  request: NextRequest,
  operation: ApiOperation,
): Promise<PublicApiContext | NextResponse> {
  const sql = getNeonClient();
  if (!sql) return apiError(503, 'API_UNAVAILABLE', 'The API is temporarily unavailable.');

  const authorization = request.headers.get('authorization')?.trim() ?? '';
  const token = /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim() ?? '';
  const match = KEY_PATTERN.exec(token);
  if (!match) {
    if (!rateLimit(`public-api-invalid:${ipKey(request)}`, 30)) {
      return apiError(429, 'RATE_LIMITED', 'Too many invalid API key attempts.', {
        headers: { 'Retry-After': '60' },
      });
    }
    return apiError(401, 'INVALID_API_KEY', 'A valid Lunidex API key is required.');
  }

  const keyId = match[1].toLowerCase();
  const rows = await sql`
    select k.id::text, k.user_id::text, k.key_hash, k.permission, u.deletion_state
    from public.api_keys k
    join app.users u on u.id = k.user_id
    where k.id = ${keyId}::uuid
      and k.revoked_at is null
    limit 1
  ` as ApiKeyRow[];
  const key = rows[0];
  const suppliedHash = Buffer.from(sha256(token), 'hex');
  const storedHash = key ? Buffer.from(key.key_hash.trim(), 'hex') : Buffer.alloc(0);
  if (!key || suppliedHash.length !== storedHash.length || !timingSafeEqual(suppliedHash, storedHash)) {
    if (!rateLimit(`public-api-invalid:${ipKey(request)}`, 30)) {
      return apiError(429, 'RATE_LIMITED', 'Too many invalid API key attempts.', {
        headers: { 'Retry-After': '60' },
      });
    }
    return apiError(401, 'INVALID_API_KEY', 'A valid Lunidex API key is required.');
  }
  if (key.deletion_state !== 'active') {
    return apiError(410, 'ACCOUNT_UNAVAILABLE', 'This account is being deleted.');
  }
  if (operation === 'write' && key.permission !== 'read_write') {
    return apiError(403, 'INSUFFICIENT_PERMISSION', 'This API key does not allow writes.');
  }
  return { sql, userId: key.user_id, keyId: key.id, permission: key.permission };
}

function utcWindowStart(milliseconds: number): string {
  return new Date(Math.floor(Date.now() / milliseconds) * milliseconds).toISOString();
}

function quotaReservations(context: PublicApiContext, operation: ApiOperation, cost: ApiCostClass): QuotaReservation[] {
  const userSubject = `user:${context.userId}`;
  const minute = utcWindowStart(60_000);
  const day = utcWindowStart(86_400_000);
  const rows: QuotaReservation[] = operation === 'read'
    ? [
      { subject_key: userSubject, bucket_type: 'read_minute', window_start: minute, limit_count: 60 },
      { subject_key: userSubject, bucket_type: 'read_day', window_start: day, limit_count: 1_000 },
    ]
    : [
      { subject_key: userSubject, bucket_type: 'write_minute', window_start: minute, limit_count: 10 },
      { subject_key: userSubject, bucket_type: 'write_day', window_start: day, limit_count: 100 },
    ];

  if (cost === 'cards') {
    rows.push(
      { subject_key: userSubject, bucket_type: 'cards_day', window_start: day, limit_count: 100 },
      { subject_key: 'global', bucket_type: 'cards_global_day', window_start: day, limit_count: 5_000 },
    );
  } else if (cost === 'sealed') {
    rows.push(
      { subject_key: userSubject, bucket_type: 'sealed_day', window_start: day, limit_count: 100 },
      { subject_key: 'global', bucket_type: 'sealed_global_day', window_start: day, limit_count: 5_000 },
    );
  }
  return rows;
}

async function reserveQuota(
  context: PublicApiContext,
  operation: ApiOperation,
  cost: ApiCostClass,
): Promise<QuotaResult> {
  const requested = quotaReservations(context, operation, cost);
  const requestedJson = JSON.stringify(requested);
  const [accountRows, inserted, locked, updated] = await context.sql.transaction((tx) => [
    tx`
      select id
      from app.users
      where id = ${context.userId}::uuid and deletion_state = 'active'
      for share
    `,
    tx`
      with requested as (
        select *
        from jsonb_to_recordset(${requestedJson}::jsonb)
          as item(subject_key text, bucket_type text, window_start timestamptz, limit_count integer)
      )
      insert into public.api_quota_buckets
        (subject_key, bucket_type, window_start, request_count, limit_count)
      select subject_key, bucket_type, window_start, 0, limit_count
      from requested
      cross join (
        select id from app.users
        where id = ${context.userId}::uuid and deletion_state = 'active'
      ) active_account
      on conflict (subject_key, bucket_type, window_start) do nothing
    `,
    tx`
      with requested as (
        select *
        from jsonb_to_recordset(${requestedJson}::jsonb)
          as item(subject_key text, bucket_type text, window_start timestamptz, limit_count integer)
      )
      select q.subject_key, q.bucket_type, q.window_start::text,
        q.request_count, requested.limit_count,
        (q.window_start + case
          when q.bucket_type like '%minute' then interval '1 minute'
          else interval '1 day'
        end)::text as reset_at
      from public.api_quota_buckets q
      join requested using (subject_key, bucket_type, window_start)
      order by q.subject_key, q.bucket_type, q.window_start
      for update of q
    `,
    tx`
      with requested as (
        select *
        from jsonb_to_recordset(${requestedJson}::jsonb)
          as item(subject_key text, bucket_type text, window_start timestamptz, limit_count integer)
      ), eligible as (
        select count(*) = (select count(*) from requested) as allowed
        from public.api_quota_buckets q
        join requested using (subject_key, bucket_type, window_start)
        where q.request_count < requested.limit_count
      )
      update public.api_quota_buckets q
      set request_count = q.request_count + 1,
          limit_count = requested.limit_count
      from requested, eligible
      where q.subject_key = requested.subject_key
        and q.bucket_type = requested.bucket_type
        and q.window_start = requested.window_start
        and eligible.allowed
      returning q.bucket_type
    `,
  ]) as [Array<{ id: string }>, unknown[], Array<{
    subject_key: string;
    bucket_type: string;
    window_start: string;
    request_count: number;
    limit_count: number;
    reset_at: string;
  }>, Array<{ bucket_type: string }>];
  if (!accountRows[0]) throw new ApiAccountUnavailableError();
  void inserted;
  if (updated.length === requested.length) return { allowed: true, blocked: [] };
  const blocked = locked
    .filter((row) => Number(row.request_count) >= Number(row.limit_count))
    .map((row) => ({ bucket: row.bucket_type, resetAt: row.reset_at }));
  return { allowed: false, blocked };
}

function quotaResponse(blocked: QuotaResult['blocked']): NextResponse {
  const resetAt = blocked
    .map((item) => Date.parse(item.resetAt))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0] ?? Date.now() + 60_000;
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1_000));
  return apiError(429, 'RATE_LIMITED', 'The API quota has been reached.', {
    details: { limits: blocked.map((item) => item.bucket) },
    headers: { 'Retry-After': String(retryAfter) },
  });
}

async function recordUsage(context: PublicApiContext, endpoint: string, status: number): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const statusFamily = Math.min(5, Math.max(1, Math.floor(status / 100)));
  await context.sql.transaction((tx) => [
    tx`
      insert into public.api_usage_daily (day, api_key_id, endpoint, status_family, request_count, last_at)
      values (${day}::date, ${context.keyId}::uuid, ${endpoint}, ${statusFamily}, 1, now())
      on conflict (day, api_key_id, endpoint, status_family) do update
        set request_count = public.api_usage_daily.request_count + 1,
            last_at = now()
    `,
    tx`
      update public.api_keys
      set last_used_at = now()
      where id = ${context.keyId}::uuid
        and revoked_at is null
        and (last_used_at is null or last_used_at < now() - interval '5 minutes')
    `,
  ]);
}

export async function runPublicApi(
  request: NextRequest,
  endpoint: string,
  operation: ApiOperation,
  cost: ApiCostClass,
  handler: (context: PublicApiContext) => Promise<Response>,
): Promise<Response> {
  let authentication: PublicApiContext | NextResponse;
  try {
    authentication = await authenticateApiKey(request, operation);
  } catch {
    return apiError(503, 'API_UNAVAILABLE', 'The API is temporarily unavailable.');
  }
  if (!isApiContext(authentication)) return authentication;

  let quota: QuotaResult;
  try {
    quota = await reserveQuota(authentication, operation, cost);
  } catch (error) {
    if (error instanceof ApiAccountUnavailableError || isInactiveAccountError(error)) {
      return apiError(410, 'ACCOUNT_UNAVAILABLE', 'This account is being deleted.');
    }
    return apiError(503, 'API_UNAVAILABLE', 'The API is temporarily unavailable.');
  }
  if (!quota.allowed) {
    const response = quotaResponse(quota.blocked);
    await recordUsage(authentication, endpoint, response.status).catch(() => undefined);
    return response;
  }

  let response: Response;
  try {
    response = await handler(authentication);
  } catch (error) {
    response = mapApiError(error);
  }
  try {
    const accountRows = await authentication.sql`
      select deletion_state
      from app.users
      where id = ${authentication.userId}::uuid
      limit 1
    ` as Array<{ deletion_state: 'active' | 'pending' | 'deleted' }>;
    if (accountRows[0]?.deletion_state !== 'active') {
      response = apiError(410, 'ACCOUNT_UNAVAILABLE', 'This account is being deleted.');
    }
  } catch {
    response = apiError(503, 'API_UNAVAILABLE', 'The API is temporarily unavailable.');
  }
  await recordUsage(authentication, endpoint, response.status).catch(() => undefined);
  return response;
}

export async function getUserSessionContext(request: NextRequest): Promise<PublicApiContext | NextResponse> {
  const sql = getNeonClient();
  if (!sql) return apiError(503, 'API_UNAVAILABLE', 'The account service is temporarily unavailable.');
  const user = await getNeonUserFromRequest(request);
  if (!user) return apiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to manage API keys.');
  try {
    if (await ensureNeonUser(sql, user) === false) {
      return apiError(410, 'ACCOUNT_UNAVAILABLE', 'This account is being deleted.');
    }
  } catch (error) {
    if (isInactiveAccountError(error)) return apiError(410, 'ACCOUNT_UNAVAILABLE', 'This account is being deleted.');
    throw error;
  }
  return { sql, userId: user.id, keyId: '', permission: 'read_write' };
}

export async function createApiKey(
  context: PublicApiContext,
  name: string,
  permission: ApiPermission,
): Promise<{ id: string; prefix: string; token: string; createdAt: string } | null> {
  const material = createApiKeyMaterial();
  const rows = await context.sql.transaction((tx) => [
    tx`select id, deletion_state from app.users where id = ${context.userId}::uuid for update`,
    tx`
      insert into public.api_keys (id, user_id, name, key_prefix, key_hash, permission)
      select ${material.id}::uuid, ${context.userId}::uuid, ${name}, ${material.prefix}, ${material.hash}, ${permission}
      where exists (
        select 1 from app.users where id = ${context.userId}::uuid and deletion_state = 'active'
      ) and (
        select count(*) < 5
        from public.api_keys
        where user_id = ${context.userId}::uuid and revoked_at is null
      )
      returning id::text, created_at::text
    `,
  ]) as [Array<{ id: string; deletion_state: 'active' | 'pending' | 'deleted' }>, Array<{ id: string; created_at: string }>];
  if (rows[0][0]?.deletion_state !== 'active') throw new ApiAccountUnavailableError();
  const inserted = rows[1][0];
  return inserted ? {
    id: inserted.id,
    prefix: material.prefix,
    token: material.token,
    createdAt: inserted.created_at,
  } : null;
}

export async function listApiKeys(context: PublicApiContext): Promise<Array<{
  id: string;
  name: string;
  prefix: string;
  permission: ApiPermission;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}>> {
  const rows = await context.sql`
    select id::text, name, key_prefix, permission,
      created_at::text as created_at, last_used_at::text as last_used_at,
      revoked_at::text as revoked_at
    from public.api_keys
    where user_id = ${context.userId}::uuid
    order by created_at desc, id desc
  ` as Array<{
    id: string;
    name: string;
    key_prefix: string;
    permission: ApiPermission;
    created_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
  }>;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    prefix: row.key_prefix,
    permission: row.permission,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  }));
}

export async function revokeApiKey(context: PublicApiContext, keyId: string): Promise<boolean> {
  const rows = await context.sql`
    update public.api_keys
    set revoked_at = coalesce(revoked_at, now())
    where id = ${keyId}::uuid and user_id = ${context.userId}::uuid
    returning id
  ` as Array<{ id: string }>;
  return Boolean(rows[0]);
}

export function encodeApiCursor(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function decodeApiCursor(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  if (value.length > 1_024 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function parsePageSize(value: string | null, defaultValue = 25, maximum = 100): number | null {
  if (value === null) return defaultValue;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : null;
}

export function apiUnavailable(): NextResponse {
  return apiError(503, 'API_UNAVAILABLE', 'The API is temporarily unavailable.');
}

export function mapApiError(error: unknown): NextResponse {
  if (isInactiveAccountError(error)) return apiError(410, 'ACCOUNT_UNAVAILABLE', 'This account is being deleted.');
  return apiError(500, 'INTERNAL_ERROR', 'The API request failed.');
}
