import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { ensureNeonUser, getNeonUserFromRequest } from '@/lib/neon/auth';
import { isInactiveAccountError } from '@/lib/neon/errors';
import { getNeonClient, type NeonSql } from '@/lib/neon/server';
import { rateLimit } from '@/lib/rate-limit';
import type {
  FriendCollectionPage,
  FriendCollectionSummary,
  FriendDeck,
  FriendDeckCard,
  FriendDeckResult,
  FriendDirectoryEntry,
  FriendPrivacySettings,
  FriendRelation,
  FriendRelationStatus,
} from '@/types/friends';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIVATE_NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

interface RelationRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendRelationStatus;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  other_user_id: string | null;
  other_handle: string | null;
  other_display_name: string | null;
  other_allow_friend_requests: boolean | null;
  other_share_tcg_collection: boolean | null;
  other_share_tcg_decks: boolean | null;
}

interface DirectoryRow {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  allow_friend_requests: boolean;
  share_tcg_collection: boolean;
  share_tcg_decks: boolean;
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendRelationStatus;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
}

interface PrivacyRow {
  allow_friend_requests: boolean;
  share_tcg_collection: boolean;
  share_tcg_decks: boolean;
}

interface SnapshotSummaryRow {
  total_owned: number;
  distinct_owned: number;
  updated_at: string | null;
}

interface CollectionPageRow {
  card_id: string;
  total_owned: number;
  distinct_owned: number;
  has_more: boolean;
}

interface DeckSnapshotRow {
  decks: unknown;
  updated_at: string | null;
}

interface FriendsPayload {
  action?: unknown;
  handle?: unknown;
  friendshipId?: unknown;
  response?: unknown;
  settings?: unknown;
}

function isFriendDeckCard(value: unknown): value is FriendDeckCard {
  if (typeof value !== 'object' || value === null) return false;
  const card = value as { cardId?: unknown; quantity?: unknown };
  return typeof card.cardId === 'string'
    && typeof card.quantity === 'number'
    && Number.isFinite(card.quantity)
    && card.quantity > 0;
}

function isFriendDeck(value: unknown): value is FriendDeck {
  if (typeof value !== 'object' || value === null) return false;
  const deck = value as { id?: unknown; name?: unknown; createdAt?: unknown; cards?: unknown };
  return typeof deck.id === 'string'
    && typeof deck.name === 'string'
    && typeof deck.createdAt === 'string'
    && Array.isArray(deck.cards)
    && deck.cards.every(isFriendDeckCard);
}

interface RequestContext {
  sql: NeonSql;
  userId: string;
}

function unavailable(): NextResponse {
  return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });
}

function accountDeletionInProgress(): NextResponse {
  return NextResponse.json(
    { error: 'Account deletion is in progress' },
    { status: 410, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

async function getContext(request: NextRequest): Promise<RequestContext | NextResponse> {
  const sql = getNeonClient();
  if (!sql) return unavailable();

  const user = await getNeonUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });

  if (await ensureNeonUser(sql, user) === false) {
    return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  }
  return { sql, userId: user.id };
}

function isContext(value: RequestContext | NextResponse): value is RequestContext {
  return 'sql' in value;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function toDirectoryEntry(row: DirectoryRow): FriendDirectoryEntry {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name?.trim() || 'Trainer',
    allowFriendRequests: row.allow_friend_requests,
    shareTcgCollection: row.share_tcg_collection,
    shareTcgDecks: row.share_tcg_decks,
  };
}

function toRelation(row: FriendshipRow, directory: FriendDirectoryEntry | null): FriendRelation {
  return {
    id: row.id,
    requesterId: row.requester_id,
    addresseeId: row.addressee_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    respondedAt: row.responded_at,
    otherUser: directory,
  };
}

function toRelationWithDirectory(row: RelationRow): FriendRelation {
  const directory = row.other_user_id
    ? {
      userId: row.other_user_id,
      handle: row.other_handle,
      displayName: row.other_display_name?.trim() || 'Trainer',
      allowFriendRequests: Boolean(row.other_allow_friend_requests),
      shareTcgCollection: Boolean(row.other_share_tcg_collection),
      shareTcgDecks: Boolean(row.other_share_tcg_decks),
    }
    : null;
  return toRelation(row, directory);
}

async function getRelation(sql: NeonSql, userId: string, friendshipId: string): Promise<FriendRelation | null> {
  const rows = await sql`
    select f.id, f.requester_id, f.addressee_id, f.status,
      f.created_at, f.updated_at, f.responded_at,
      d.user_id as other_user_id, d.handle as other_handle,
      d.display_name as other_display_name,
      d.allow_friend_requests as other_allow_friend_requests,
      d.share_tcg_collection as other_share_tcg_collection,
      d.share_tcg_decks as other_share_tcg_decks
    from public.friendships f
    left join public.friend_directory d
      on d.user_id = case when f.requester_id = ${userId}::uuid then f.addressee_id else f.requester_id end
    where f.id = ${friendshipId}::uuid
      and ${userId}::uuid in (f.requester_id, f.addressee_id)
    limit 1
  ` as RelationRow[];
  return rows[0] ? toRelationWithDirectory(rows[0]) : null;
}

async function getDirectory(
  sql: NeonSql,
  userId: string,
  targetId: string,
): Promise<FriendDirectoryEntry | null> {
  const rows = await sql`
    select d.user_id, d.handle, d.display_name,
      d.allow_friend_requests, d.share_tcg_collection, d.share_tcg_decks
    from public.friend_directory d
    where d.user_id = ${targetId}::uuid
      and (
        d.user_id = ${userId}::uuid
        or d.allow_friend_requests = true
        or exists (
          select 1 from public.friendships f
          where f.status in ('pending', 'accepted')
            and ((f.requester_id = ${userId}::uuid and f.addressee_id = d.user_id)
              or (f.addressee_id = ${userId}::uuid and f.requester_id = d.user_id))
        )
      )
    limit 1
  ` as DirectoryRow[];
  return rows[0] ? toDirectoryEntry(rows[0]) : null;
}

async function canViewSnapshot(sql: NeonSql, userId: string, friendId: string, field: 'share_tcg_collection' | 'share_tcg_decks'): Promise<boolean> {
  const rows = field === 'share_tcg_collection'
    ? await sql`
      select (
        ${userId}::uuid = ${friendId}::uuid
        or exists (
          select 1
          from public.friendships f
          join public.friend_directory d on d.user_id = ${friendId}::uuid
          where f.status = 'accepted'
            and d.share_tcg_collection = true
            and ((f.requester_id = ${userId}::uuid and f.addressee_id = ${friendId}::uuid)
              or (f.addressee_id = ${userId}::uuid and f.requester_id = ${friendId}::uuid))
        )
      ) as allowed
    `
    : await sql`
      select (
        ${userId}::uuid = ${friendId}::uuid
        or exists (
          select 1
          from public.friendships f
          join public.friend_directory d on d.user_id = ${friendId}::uuid
          where f.status = 'accepted'
            and d.share_tcg_decks = true
            and ((f.requester_id = ${userId}::uuid and f.addressee_id = ${friendId}::uuid)
              or (f.addressee_id = ${userId}::uuid and f.requester_id = ${friendId}::uuid))
        )
      ) as allowed
    `;
  const allowed = rows[0] as { allowed?: unknown } | undefined;
  return allowed?.allowed === true;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = await getContext(request);
  if (!isContext(context)) return context;
  const { sql, userId } = context;
  const action = request.nextUrl.searchParams.get('action') ?? 'relations';

  if (action === 'privacy') {
    const rows = await sql`
      select allow_friend_requests, share_tcg_collection, share_tcg_decks
      from public.profiles
      where id = ${userId}::uuid
      limit 1
    ` as PrivacyRow[];
    const row = rows[0];
    return NextResponse.json({
      settings: row ? {
        allowFriendRequests: row.allow_friend_requests,
        shareTcgCollection: row.share_tcg_collection,
        shareTcgDecks: row.share_tcg_decks,
      } satisfies FriendPrivacySettings : null,
    }, { headers: PRIVATE_NO_STORE_HEADERS });
  }

  if (action === 'relations') {
    const rows = await sql`
      select f.id, f.requester_id, f.addressee_id, f.status,
        f.created_at, f.updated_at, f.responded_at,
        d.user_id as other_user_id, d.handle as other_handle,
        d.display_name as other_display_name,
        d.allow_friend_requests as other_allow_friend_requests,
        d.share_tcg_collection as other_share_tcg_collection,
        d.share_tcg_decks as other_share_tcg_decks
      from public.friendships f
      left join public.friend_directory d
        on d.user_id = case when f.requester_id = ${userId}::uuid then f.addressee_id else f.requester_id end
      where ${userId}::uuid in (f.requester_id, f.addressee_id)
      order by f.updated_at desc
    ` as RelationRow[];
    return NextResponse.json({ relations: rows.map(toRelationWithDirectory) }, { headers: PRIVATE_NO_STORE_HEADERS });
  }

  if (action === 'directory' || action === 'search') {
    const targetId = request.nextUrl.searchParams.get('userId');
    if (action === 'directory') {
      if (!isUuid(targetId)) return NextResponse.json({ error: 'Invalid friend id' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
      return NextResponse.json({ entry: await getDirectory(sql, userId, targetId) }, { headers: PRIVATE_NO_STORE_HEADERS });
    }

    const handle = request.nextUrl.searchParams.get('handle')?.trim().toLowerCase() ?? '';
    if (!handle || handle.length > 30) return NextResponse.json({ entry: null }, { headers: PRIVATE_NO_STORE_HEADERS });
    const rows = await sql`
      select d.user_id, d.handle, d.display_name,
        d.allow_friend_requests, d.share_tcg_collection, d.share_tcg_decks
      from public.friend_directory d
      where lower(d.handle) = ${handle}
        and d.allow_friend_requests = true
      limit 1
    ` as DirectoryRow[];
    return NextResponse.json({ entry: rows[0] ? toDirectoryEntry(rows[0]) : null }, { headers: PRIVATE_NO_STORE_HEADERS });
  }

  const friendId = request.nextUrl.searchParams.get('friendId');
  if (action === 'collection-summary' || action === 'collection-page' || action === 'decks') {
    if (!isUuid(friendId)) return NextResponse.json({ error: 'Invalid friend id' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
  }

  if (action === 'collection-summary' && friendId) {
    if (!(await canViewSnapshot(sql, userId, friendId, 'share_tcg_collection'))) return NextResponse.json({ summary: null }, { headers: PRIVATE_NO_STORE_HEADERS });
    const rows = await sql`
      select (
        case when collection_state ? 'legacyOwnedCards' or collection_state ? 'collectionCards'
          then public.physical_tcg_collection_state_count(collection_state)
          else cardinality(card_ids)
        end
      )::integer as total_owned,
      cardinality(card_ids)::integer as distinct_owned,
      updated_at
      from public.friend_collection_snapshots
      where user_id = ${friendId}::uuid
      limit 1
    ` as SnapshotSummaryRow[];
    const row = rows[0];
    const summary: FriendCollectionSummary | null = row
      ? { totalOwned: Number(row.total_owned), distinctOwned: Number(row.distinct_owned), updatedAt: row.updated_at }
      : null;
    return NextResponse.json({ summary }, { headers: PRIVATE_NO_STORE_HEADERS });
  }

  if (action === 'collection-page' && friendId) {
    if (!(await canViewSnapshot(sql, userId, friendId, 'share_tcg_collection'))) return NextResponse.json({ error: 'Collection unavailable' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
    const rawLimit = Number(request.nextUrl.searchParams.get('limit') ?? 36);
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 60) : 36;
    const cursor = request.nextUrl.searchParams.get('cursor');
    const rows = await sql`
      with all_owned as (
        select distinct item as card_id
        from public.friend_collection_snapshots s
        cross join unnest(s.card_ids) as cards(item)
        where s.user_id = ${friendId}::uuid
      ),
      physical as (
        select
          (case when collection_state ? 'legacyOwnedCards' or collection_state ? 'collectionCards'
            then public.physical_tcg_collection_state_count(collection_state)
            else cardinality(card_ids)
          end)::integer as total_owned,
          cardinality(card_ids)::integer as distinct_owned
        from public.friend_collection_snapshots
        where user_id = ${friendId}::uuid
        limit 1
      ),
      owned as (
        select card_id
        from all_owned
        where ${cursor}::text is null or card_id > ${cursor}
      ),
      ranked as (
        select owned.card_id,
          (select total_owned from physical) as total_owned,
          (select distinct_owned from physical) as distinct_owned,
          row_number() over (order by owned.card_id) as row_number,
          count(*) over () > ${limit} as has_more
        from owned
      )
      select card_id, total_owned, distinct_owned, has_more
      from ranked
      where row_number <= ${limit}
      order by card_id
    ` as CollectionPageRow[];
    let totalOwned = Number(rows[0]?.total_owned ?? 0);
    let distinctOwned = Number(rows[0]?.distinct_owned ?? 0);
    if (rows.length === 0) {
      // A cursor past the last page produces no ranked rows, so recover the
      // aggregate counters instead of incorrectly reporting an empty friend
      // collection to the client.
      const totals = await sql`
        select (
          case when collection_state ? 'legacyOwnedCards' or collection_state ? 'collectionCards'
            then public.physical_tcg_collection_state_count(collection_state)
            else cardinality(card_ids)
          end
        )::integer as total_owned,
        cardinality(card_ids)::integer as distinct_owned
        from public.friend_collection_snapshots
        where user_id = ${friendId}::uuid
        limit 1
      ` as Array<{ total_owned: number; distinct_owned: number }>;
      totalOwned = Number(totals[0]?.total_owned ?? 0);
      distinctOwned = Number(totals[0]?.distinct_owned ?? 0);
    }
    const page: FriendCollectionPage = {
      cardIds: rows.map((row) => row.card_id),
      totalOwned,
      distinctOwned,
      hasMore: Boolean(rows[0]?.has_more),
    };
    return NextResponse.json({ page }, { headers: PRIVATE_NO_STORE_HEADERS });
  }

  if (action === 'decks' && friendId) {
    if (!(await canViewSnapshot(sql, userId, friendId, 'share_tcg_decks'))) return NextResponse.json({ result: null }, { headers: PRIVATE_NO_STORE_HEADERS });
    const rows = await sql`
      select decks, updated_at
      from public.friend_deck_snapshots
      where user_id = ${friendId}::uuid
      limit 1
    ` as DeckSnapshotRow[];
    const row = rows[0];
    const result: FriendDeckResult | null = row
      ? { decks: Array.isArray(row.decks) ? row.decks.filter(isFriendDeck) : [], updatedAt: row.updated_at }
      : null;
    return NextResponse.json({ result }, { headers: PRIVATE_NO_STORE_HEADERS });
  }

  return NextResponse.json({ error: 'Unknown friends action' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;

  const context = await getContext(request);
  if (!isContext(context)) return context;
  const { sql, userId } = context;
  const payload = await readJsonBody<FriendsPayload>(request);

  // Request spam control: opt-in targets and dedup already bound abuse, this
  // caps fan-out per account.
  if (payload?.action === 'send' && !rateLimit(`friend-send:${userId}`, 10)) {
    return NextResponse.json({ error: 'Too many friend requests. Please try again later.' }, { status: 429, headers: PRIVATE_NO_STORE_HEADERS });
  }

  if (payload?.action === 'send') {
    if (typeof payload.handle !== 'string' || !payload.handle.trim()) return NextResponse.json({ error: 'Friend handle is required' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    const targetRows = await sql`
      select user_id
      from public.friend_directory
      where lower(handle) = lower(${payload.handle.trim()})
        and allow_friend_requests = true
      limit 1
    ` as Array<{ user_id: string }>;
    const targetId = targetRows[0]?.user_id;
    if (!targetId) return NextResponse.json({ error: 'Friend handle not found' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
    if (targetId === userId) return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });

    const existingRows = await sql`
      select id, requester_id, addressee_id, status, created_at, updated_at, responded_at
      from public.friendships
      where least(requester_id, addressee_id) = least(${userId}::uuid, ${targetId}::uuid)
        and greatest(requester_id, addressee_id) = greatest(${userId}::uuid, ${targetId}::uuid)
      limit 1
    ` as FriendshipRow[];
    const existing = existingRows[0];
    let relation: FriendshipRow | undefined = existing;

    if (!existing || existing.status === 'declined') {
      if (existing) {
        // The database trigger intentionally permits only pending -> accepted|declined
        // updates and forbids changing participants. A declined request therefore
        // needs to be replaced atomically rather than updated in place.
        let replaced: FriendshipRow[];
        try {
          [, replaced] = await sql.transaction((tx) => [
            tx`
              delete from public.friendships
              where id = ${existing.id}::uuid
                and status = 'declined'
                and least(requester_id, addressee_id) = least(${userId}::uuid, ${targetId}::uuid)
                and greatest(requester_id, addressee_id) = greatest(${userId}::uuid, ${targetId}::uuid)
            `,
            tx`
              insert into public.friendships (requester_id, addressee_id, status)
              values (${userId}::uuid, ${targetId}::uuid, 'pending')
              returning id, requester_id, addressee_id, status, created_at, updated_at, responded_at
            `,
          ]) as [unknown[], FriendshipRow[]];
        } catch (error) {
          if (isInactiveAccountError(error)) return accountDeletionInProgress();
          return NextResponse.json({ error: 'Friend request failed' }, { status: 500 });
        }
        relation = replaced[0];
      } else {
        let inserted: FriendshipRow[];
        try {
          inserted = await sql`
            insert into public.friendships (requester_id, addressee_id, status)
            values (${userId}::uuid, ${targetId}::uuid, 'pending')
            returning id, requester_id, addressee_id, status, created_at, updated_at, responded_at
          ` as FriendshipRow[];
        } catch (error) {
          if (isInactiveAccountError(error)) return accountDeletionInProgress();
          return NextResponse.json({ error: 'Friend request failed' }, { status: 500 });
        }
        relation = inserted[0];
      }
    }

    if (!relation) return NextResponse.json({ error: 'Friend request failed' }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
    const result = await getRelation(sql, userId, relation.id);
    return result
      ? NextResponse.json({ relation: result }, { headers: PRIVATE_NO_STORE_HEADERS })
      : NextResponse.json({ error: 'Friend request failed' }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
  }

  if (payload?.action === 'respond') {
    if (!isUuid(payload.friendshipId) || (payload.response !== 'accept' && payload.response !== 'decline')) {
      return NextResponse.json({ error: 'Invalid friend request action' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    }
    const nextStatus = payload.response === 'accept' ? 'accepted' : 'declined';
    let rows: FriendshipRow[];
    try {
      rows = await sql`
        update public.friendships
        set status = ${nextStatus}, responded_at = now()
        where id = ${payload.friendshipId}::uuid
          and addressee_id = ${userId}::uuid
          and status = 'pending'
        returning id, requester_id, addressee_id, status, created_at, updated_at, responded_at
      ` as FriendshipRow[];
    } catch (error) {
      if (isInactiveAccountError(error)) return accountDeletionInProgress();
      return NextResponse.json({ error: 'Friend request failed' }, { status: 500 });
    }
    const result = rows[0] ? await getRelation(sql, userId, rows[0].id) : null;
    return result
      ? NextResponse.json({ relation: result }, { headers: PRIVATE_NO_STORE_HEADERS })
      : NextResponse.json({ error: 'Friend request not found' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
  }

  return NextResponse.json({ error: 'Invalid friends action' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;

  const context = await getContext(request);
  if (!isContext(context)) return context;
  const { sql, userId } = context;
  const payload = await readJsonBody<FriendsPayload>(request);
  const settings = payload?.settings;
  if (
    payload?.action !== 'privacy'
    || typeof settings !== 'object'
    || settings === null
    || !('allowFriendRequests' in settings)
    || !('shareTcgCollection' in settings)
    || !('shareTcgDecks' in settings)
    || typeof settings.allowFriendRequests !== 'boolean'
    || typeof settings.shareTcgCollection !== 'boolean'
    || typeof settings.shareTcgDecks !== 'boolean'
  ) {
    return NextResponse.json({ error: 'Invalid privacy settings' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
  }

  const nextSettings = settings as FriendPrivacySettings;
  try {
    await sql`
      update public.profiles
      set allow_friend_requests = ${nextSettings.allowFriendRequests},
          share_tcg_collection = ${nextSettings.shareTcgCollection},
          share_tcg_decks = ${nextSettings.shareTcgDecks}
      where id = ${userId}::uuid
    `;
  } catch (error) {
    if (isInactiveAccountError(error)) return accountDeletionInProgress();
    return NextResponse.json({ error: 'Failed to update privacy settings' }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE_HEADERS });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;

  const context = await getContext(request);
  if (!isContext(context)) return context;
  const { sql, userId } = context;
  const friendshipId = request.nextUrl.searchParams.get('id');
  if (!isUuid(friendshipId)) return NextResponse.json({ error: 'Invalid friendship id' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });

  await sql`
    delete from public.friendships
    where id = ${friendshipId}::uuid
      and ${userId}::uuid in (requester_id, addressee_id)
  `;
  return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE_HEADERS });
}
