import { NextRequest, NextResponse } from 'next/server';

import { readJsonBody, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { ensureNeonUser, getNeonUserFromRequest } from '@/lib/neon/auth';
import { deleteNeonAuthUser, getNeonAuthServer } from '@/lib/neon/server-auth';
import { getNeonClient, type NeonSql } from '@/lib/neon/server';
import { rateLimit } from '@/lib/rate-limit';

type DeletePayload = {
  confirmation?: unknown;
  password?: unknown;
};

type DeletionState = 'active' | 'pending' | 'deleted';

interface DeletionStateRow {
  deletion_state: DeletionState;
}

interface ClaimedDeletionRow {
  id: string;
}

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

function pendingResponse(status = 202): NextResponse {
  return NextResponse.json(
    {
      deletion: 'pending',
      error: 'Account deletion is pending. Please retry after authentication is available.',
    },
    { status, headers: NO_STORE_HEADERS },
  );
}

async function getDeletionState(sql: NeonSql, userId: string): Promise<DeletionState | null> {
  const rows = await sql`
    select deletion_state
    from app.users
    where id = ${userId}::uuid
    limit 1
  ` as DeletionStateRow[];
  return rows[0]?.deletion_state ?? null;
}

async function claimDeletion(sql: NeonSql, userId: string): Promise<boolean> {
  const [rows] = await sql.transaction((tx) => [
    tx`
      update app.users
      set deletion_state = 'pending',
          deleted_at = coalesce(deleted_at, now()),
          deletion_requested_at = coalesce(deletion_requested_at, now())
      where id = ${userId}::uuid
        and deletion_state = 'active'
      returning id
    `,
  ]) as [ClaimedDeletionRow[]];
  return Boolean(rows[0]);
}

/** Remove all application-owned personal data while retaining a tombstone. */
async function removeApplicationData(sql: NeonSql, userId: string): Promise<void> {
  await sql.transaction((tx) => [
    tx`delete from public.battle_rooms where player1_id = ${userId}::uuid or player2_id = ${userId}::uuid`,
    tx`delete from public.friendships where requester_id = ${userId}::uuid or addressee_id = ${userId}::uuid`,
    tx`delete from public.user_state where user_id = ${userId}::uuid`,
    tx`delete from public.profiles where id = ${userId}::uuid`,
    tx`delete from public.quiz_scores where user_id = ${userId}::uuid`,
    tx`delete from public.quiz_attempts where user_id = ${userId}::uuid`,
    tx`delete from public.tcg_price_alerts where user_id = ${userId}::uuid`,
    tx`delete from public.user_push_subscriptions where user_id = ${userId}::uuid`,
    tx`delete from public.friend_directory where user_id = ${userId}::uuid`,
    tx`delete from public.friend_collection_snapshots where user_id = ${userId}::uuid`,
    tx`delete from public.friend_deck_snapshots where user_id = ${userId}::uuid`,
  ]);
}

async function markDeleted(sql: NeonSql, userId: string): Promise<void> {
  await sql`
    update app.users
    set deletion_state = 'deleted',
        deleted_at = coalesce(deleted_at, now()),
        deletion_completed_at = now()
    where id = ${userId}::uuid
  `;
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;

  const payload = await readJsonBody<DeletePayload>(request);
  if (payload?.confirmation !== 'DELETE') {
    return NextResponse.json({ error: 'Explicit confirmation required' }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (payload.password !== undefined && (typeof payload.password !== 'string' || payload.password.length > 256)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const sql = getNeonClient();
  if (!sql || !getNeonAuthServer()) {
    return NextResponse.json({ error: 'Account deletion unavailable' }, { status: 503, headers: NO_STORE_HEADERS });
  }

  // Account deletion is the one endpoint allowed to inspect a pending or
  // terminal tombstone so that retries remain possible and idempotent.
  const user = await getNeonUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: NO_STORE_HEADERS });

  // Deletion triggers an auth-provider call plus a multi-table transaction;
  // throttle retries per account while keeping legitimate retries possible.
  if (!rateLimit(`account-delete:${user.id}`, 3)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: NO_STORE_HEADERS });
  }

  let state = await getDeletionState(sql, user.id);
  if (!state) {
    await ensureNeonUser(sql, user);
    state = await getDeletionState(sql, user.id);
  }
  if (!state) return NextResponse.json({ error: 'Account deletion unavailable' }, { status: 503, headers: NO_STORE_HEADERS });
  if (state === 'deleted') return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });

  if (state === 'active') {
    await claimDeletion(sql, user.id);
    state = await getDeletionState(sql, user.id);
    if (state === 'deleted') return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
  }

  // Local cleanup is idempotent and happens before the provider call. If the
  // provider is unavailable, the tombstone blocks all application endpoints
  // while preserving a durable retry path instead of leaving an active account
  // with an unclear half-deleted data set.
  try {
    await removeApplicationData(sql, user.id);
  } catch {
    return pendingResponse(503);
  }

  let authDeletion: Awaited<ReturnType<typeof deleteNeonAuthUser>>;
  try {
    authDeletion = await deleteNeonAuthUser(
      request,
      typeof payload.password === 'string' && payload.password ? payload.password : undefined,
    );
  } catch {
    return pendingResponse();
  }

  if (!authDeletion?.success) return pendingResponse();

  try {
    await markDeleted(sql, user.id);
  } catch {
    // The provider is already deleted, but the tombstone remains pending and
    // can be reconciled safely by a later retry or an operational cleanup.
    return pendingResponse(503);
  }

  const response = new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
  const setCookies = authDeletion.response.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) response.headers.append('Set-Cookie', cookie);
  return response;
}
