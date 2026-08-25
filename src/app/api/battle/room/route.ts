/**
 * Battle Room API
 *
 * POST /api/battle/room  — create a new battle room
 * GET  /api/battle/room?id=<uuid>  — fetch room state
 *
 * ─── Neon SQL schema ──────────────────────────────────────────────────────
 *
 * The table is created by `neon/migrations/0001_lunidex_app.sql`:
 *
 * CREATE TABLE IF NOT EXISTS public.battle_rooms (
 *   id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   player1_id   UUID REFERENCES app.users(id),
 *   player2_id   UUID REFERENCES app.users(id),
 *   player1_team JSONB,
 *   player2_team JSONB,
 *   state        JSONB    DEFAULT '{}',
 *   status       TEXT     DEFAULT 'waiting',   -- waiting|active|finished
 *   created_at   TIMESTAMPTZ DEFAULT now()
 * );
 *
 * Authorization is enforced in this route after Neon Auth verifies the
 * bearer token. An optional cleanup job can be scheduled by the deployment.
 *
 * ──────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { ensureNeonUser, getNeonUserFromRequest } from '@/lib/neon/auth';
import { isInactiveAccountError } from '@/lib/neon/errors';
import { getNeonClient } from '@/lib/neon/server';

const MAX_TEAM_SIZE = 6;
const MAX_CHAT_MESSAGES = 100;
const MIN_POKEMON_ID = 1;
const MAX_POKEMON_ID = 1025;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIVATE_NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

interface BattleTeamMember {
  id: number;
}

interface BattleRoomRow {
  id: string;
  player1_id: string | null;
  player2_id: string | null;
  status: 'waiting' | 'active' | 'finished';
  state: unknown;
  created_at: string;
}

interface BattleChatMessage {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
}

function isPlainObject(value: unknown): value is object {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Accept only the compact team contract currently needed by battle rooms.
 * Canonicalising instead of passing request objects into JSONB prevents callers
 * from persisting arbitrary future state, nested payloads, or metadata.
 */
function parseTeam(value: unknown): BattleTeamMember[] | null {
  if (!Array.isArray(value) || value.length > MAX_TEAM_SIZE) return null;

  const ids = new Set<number>();
  const team: BattleTeamMember[] = [];
  for (const member of value) {
    if (!isPlainObject(member) || Object.keys(member).length !== 1 || !('id' in member)) return null;
    const id = Reflect.get(member, 'id');
    if (typeof id !== 'number' || !Number.isInteger(id) || id < MIN_POKEMON_ID || id > MAX_POKEMON_ID || ids.has(id)) return null;
    ids.add(id);
    team.push({ id });
  }
  return team;
}

// POST /api/battle/room — create a room
export async function POST(req: NextRequest) {
  const originError = requireTrustedMutationOrigin(req);
  if (originError) return originError;

  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });
  const user = await getNeonUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`battle-room-create:${user.id}`, 10)) {
    return NextResponse.json({ error: 'Too many room creations' }, { status: 429 });
  }
  if (await ensureNeonUser(sql, user) === false) {
    return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const body = await readJsonBody<{ team?: unknown }>(req);
  if (!body) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  let safeTeam: BattleTeamMember[] | null = null;
  if ('team' in body) {
    safeTeam = parseTeam(body.team);
    if (!safeTeam) {
      return NextResponse.json({ error: `Team must contain up to ${MAX_TEAM_SIZE} unique Pokémon IDs` }, { status: 400 });
    }
  }

  let rows: Array<{ id: string; status: string; created_at: string }>;
  try {
    rows = await sql`
      insert into public.battle_rooms (player1_id, player1_team, status)
      values (
        ${user.id}::uuid,
        ${safeTeam ? JSON.stringify(safeTeam) : null}::jsonb,
        'waiting'
      )
      returning id, status, created_at
    ` as Array<{ id: string; status: string; created_at: string }>;
  } catch (error) {
    if (isInactiveAccountError(error)) {
      return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: PRIVATE_NO_STORE_HEADERS });
    }
    return NextResponse.json({ error: 'Failed to create battle room' }, { status: 500 });
  }
  const data = rows[0];
  if (!data) return NextResponse.json({ error: 'Failed to create battle room' }, { status: 500 });

  return NextResponse.json(
    { roomId: data.id, status: data.status, createdAt: data.created_at },
    { headers: PRIVATE_NO_STORE_HEADERS },
  );
}

// GET /api/battle/room?id=<uuid> — fetch room
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing room id' }, { status: 400 });
  }
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Invalid room id' }, { status: 400 });
  }

  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });
  const user = await getNeonUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (await ensureNeonUser(sql, user) === false) {
    return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const rows = await sql`
    select id, player1_id, player2_id, status, state, created_at
    from public.battle_rooms
    where id = ${id}::uuid
      and ${user.id}::uuid in (player1_id, player2_id)
    limit 1
  ` as BattleRoomRow[];
  const data = rows[0];
  if (!data) return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });

  return NextResponse.json(data, { headers: PRIVATE_NO_STORE_HEADERS });
}

// PATCH /api/battle/room?id=<uuid> — join or append chat
export async function PATCH(req: NextRequest) {
  const originError = requireTrustedMutationOrigin(req);
  if (originError) return originError;

  const id = req.nextUrl.searchParams.get('id');
  if (!id || !UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Invalid room id' }, { status: 400 });
  }

  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });
  const user = await getNeonUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (await ensureNeonUser(sql, user) === false) {
    return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const body = await readJsonBody<{ action?: unknown; text?: unknown }>(req);
  if (!body || (body.action !== 'join' && body.action !== 'chat')) {
    return NextResponse.json({ error: 'Invalid battle action' }, { status: 400 });
  }

  if (body.action === 'join') {
    let rows: BattleRoomRow[];
    try {
      rows = await sql`
        update public.battle_rooms
        set
          player2_id = case
            when player1_id is not null
              and player1_id <> ${user.id}::uuid
              and player2_id is null then ${user.id}::uuid
            else player2_id
          end,
          status = case
            when player1_id is not null and (
              player2_id is not null or (player1_id <> ${user.id}::uuid and player2_id is null)
            ) then 'active'
            else status
          end
        where id = ${id}::uuid
          and (
            ${user.id}::uuid in (player1_id, player2_id)
            or (status = 'waiting' and player1_id is not null and player2_id is null)
          )
        returning id, player1_id, player2_id, status, state, created_at
      ` as BattleRoomRow[];
    } catch (error) {
      if (isInactiveAccountError(error)) {
        return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: PRIVATE_NO_STORE_HEADERS });
      }
      return NextResponse.json({ error: 'Failed to join battle room' }, { status: 500 });
    }
    if (!rows[0]) return NextResponse.json({ error: 'Room not found or unavailable' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
    return NextResponse.json(rows[0], { headers: PRIVATE_NO_STORE_HEADERS });
  }

  if (typeof body.text !== 'string') {
    return NextResponse.json({ error: 'Chat message is required' }, { status: 400 });
  }
  const text = body.text.trim();
  if (!text || text.length > 500) {
    return NextResponse.json({ error: 'Chat message must contain 1 to 500 characters' }, { status: 400 });
  }
  if (!rateLimit(`battle-chat:${user.id}`, 60)) {
    return NextResponse.json({ error: 'Too many chat messages' }, { status: 429 });
  }

  const timestamp = Date.now();
  const message: BattleChatMessage = {
    id: `${user.id}-${timestamp}`,
    userId: user.id,
    text,
    timestamp,
  };
  let rows: BattleRoomRow[];
  try {
    rows = await sql`
      with eligible as (
        select
          id,
          state,
          coalesce(state->'chat', '[]'::jsonb) || ${JSON.stringify([message])}::jsonb as messages
        from public.battle_rooms
        where id = ${id}::uuid
          and ${user.id}::uuid in (player1_id, player2_id)
        for update
      ), bounded as (
        select
          id,
          state,
          (
            select coalesce(jsonb_agg(value order by ord), '[]'::jsonb)
            from jsonb_array_elements(messages) with ordinality as entries(value, ord)
            where ord > greatest(jsonb_array_length(messages) - ${MAX_CHAT_MESSAGES}, 0)
          ) as chat
        from eligible
      )
      update public.battle_rooms as rooms
      set state = jsonb_set(coalesce(bounded.state, '{}'::jsonb), '{chat}', bounded.chat)
      from bounded
      where rooms.id = bounded.id
      returning rooms.id, rooms.player1_id, rooms.player2_id, rooms.status, rooms.state, rooms.created_at
    ` as BattleRoomRow[];
  } catch (error) {
    if (isInactiveAccountError(error)) {
      return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: PRIVATE_NO_STORE_HEADERS });
    }
    return NextResponse.json({ error: 'Failed to update battle room' }, { status: 500 });
  }
  if (!rows[0]) return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
  return NextResponse.json(rows[0], { headers: PRIVATE_NO_STORE_HEADERS });
}
