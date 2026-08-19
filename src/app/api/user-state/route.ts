import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { ensureNeonUser, getNeonUserFromRequest } from '@/lib/neon/auth';
import { getNeonClient, type NeonSql } from '@/lib/neon/server';

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sql = getNeonClient();
  if (!sql) return unavailable();

  const user = await getNeonUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  if (await ensureNeonUser(sql, user) === false) {
    return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  }
  const row = await getCurrentState(sql, user.id);
  return NextResponse.json({ data: row?.data ?? {}, updatedAt: row?.updated_at ?? null }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;

  const sql = getNeonClient();
  if (!sql) return unavailable();

  const user = await getNeonUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const payload = await readJsonBody<UserStatePayload>(request);
  if (!payload || !isJsonObject(payload.data)) {
    return NextResponse.json({ error: 'Invalid state payload' }, { status: 400 });
  }

  const serialized = JSON.stringify(payload.data);
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

  const updatedRows = expectedUpdatedAt === null || expectedUpdatedAt === undefined
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
