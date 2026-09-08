import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { ensureNeonUser, getNeonUserFromRequest } from '@/lib/neon/auth';
import { isInactiveAccountError } from '@/lib/neon/errors';
import { getNeonClient, type NeonSql } from '@/lib/neon/server';
import { normalizeUserStateData } from '@/lib/tcg-owned-cards';
import { rateLimit } from '@/lib/rate-limit';
import { withObservedRouteHandler } from '@/lib/api/observed-route';

const MAX_STATE_BYTES = 2_000_000;

interface UserStateRow {
  data: unknown;
  updated_at: string;
}

interface UserStatePayload {
  data?: unknown;
  expectedUpdatedAt?: unknown;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function unavailable(): NextResponse {
  return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });
}

function isExpectedDependencyFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; code?: unknown };
  const name = typeof candidate.name === 'string' ? candidate.name : '';
  const code = typeof candidate.code === 'string' ? candidate.code : '';
  return name === 'NeonDbError'
    || name === 'FetchError'
    || name === 'TimeoutError'
    || name === 'AbortError'
    || code.startsWith('08')
    || code === '53300'
    || code === '57P01';
}

async function getCurrentState(
  sql: NeonSql,
  userId: string,
): Promise<UserStateRow | null> {
  const rows = await sql`
    select data, updated_at::text as updated_at
    from public.user_state
    where user_id = ${userId}::uuid
    limit 1
  ` as UserStateRow[];
  return rows[0] ?? null;
}

async function getUserState(request: NextRequest): Promise<NextResponse> {
  const sql = getNeonClient();
  if (!sql) return unavailable();

  const user = await getNeonUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  if (!rateLimit(`user-state-read:${user.id}`, 120)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  }

  if (await ensureNeonUser(sql, user) === false) {
    return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  }
  const row = await getCurrentState(sql, user.id);
  const data = isJsonObject(row?.data)
    ? normalizeUserStateData(row.data) ?? row.data
    : {};
  return NextResponse.json({ data, updatedAt: row?.updated_at ?? null }, { headers: { 'Cache-Control': 'private, no-store' } });
}

async function putUserState(request: NextRequest): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;

  const sql = getNeonClient();
  if (!sql) return unavailable();

  const user = await getNeonUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  // Writes rewrite the full snapshot; the client debounces, so a generous
  // per-account ceiling only blocks runaway loops.
  if (!rateLimit(`user-state-write:${user.id}`, 60)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const payload = await readJsonBody<UserStatePayload>(request, { maxBytes: MAX_STATE_BYTES });
  if (!payload || !isJsonObject(payload.data)) {
    return NextResponse.json({ error: 'Invalid state payload' }, { status: 400 });
  }

  const normalizedData = normalizeUserStateData(payload.data);
  if (!normalizedData) {
    return NextResponse.json({ error: 'Invalid TCG collection' }, { status: 400 });
  }

  const serialized = JSON.stringify(normalizedData);
  if (new TextEncoder().encode(serialized).byteLength > MAX_STATE_BYTES) {
    return NextResponse.json({ error: 'State payload is too large' }, { status: 413 });
  }

  const expectedUpdatedAt = payload.expectedUpdatedAt;
  if (
    expectedUpdatedAt !== null
    && expectedUpdatedAt !== undefined
    && (typeof expectedUpdatedAt !== 'string' || !isValidTimestamp(expectedUpdatedAt))
  ) {
    return NextResponse.json({ error: 'Invalid state version' }, { status: 400 });
  }

  if (await ensureNeonUser(sql, user) === false) {
    return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  }

  let updatedRows: UserStateRow[];
  try {
    updatedRows = expectedUpdatedAt === null || expectedUpdatedAt === undefined
      ? await sql`
        insert into public.user_state (user_id, data)
        values (${user.id}::uuid, ${serialized}::jsonb)
        on conflict (user_id) do nothing
        returning data, updated_at::text as updated_at
      ` as UserStateRow[]
      : await sql`
        update public.user_state
        set data = ${serialized}::jsonb
        where user_id = ${user.id}::uuid
          and updated_at = ${expectedUpdatedAt}::timestamptz
        returning data, updated_at::text as updated_at
      ` as UserStateRow[];
  } catch (error) {
    if (isInactiveAccountError(error)) {
      return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (isExpectedDependencyFailure(error)) return unavailable();
    throw error;
  }

  const updated = updatedRows[0];
  if (updated) {
    return NextResponse.json({ ok: true, data: updated.data, updatedAt: updated.updated_at }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  const current = await getCurrentState(sql, user.id);
  return NextResponse.json(
    { conflict: true, data: current?.data ?? {}, updatedAt: current?.updated_at ?? null },
    { status: 409, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

async function safeGetUserState(request: NextRequest): Promise<NextResponse> {
  try {
    return await getUserState(request);
  } catch (error) {
    if (isInactiveAccountError(error)) {
      return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (isExpectedDependencyFailure(error)) return unavailable();
    throw error;
  }
}

async function safePutUserState(request: NextRequest): Promise<NextResponse> {
  try {
    return await putUserState(request);
  } catch (error) {
    if (isInactiveAccountError(error)) {
      return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (isExpectedDependencyFailure(error)) return unavailable();
    throw error;
  }
}

export const GET = withObservedRouteHandler('/api/user-state', 'sync', safeGetUserState);
export const PUT = withObservedRouteHandler('/api/user-state', 'sync', safePutUserState);
