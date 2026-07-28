/**
 * Battle Room API
 *
 * POST /api/battle/room  — create a new battle room
 * GET  /api/battle/room?id=<uuid>  — fetch room state
 *
 * ─── Supabase SQL schema ───────────────────────────────────────────────────
 *
 * Run this migration in your Supabase project (SQL Editor or supabase/migrations):
 *
 * -- supabase/migrations/20240101000000_battle_rooms.sql
 *
 * CREATE TABLE IF NOT EXISTS battle_rooms (
 *   id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   player1_id   UUID REFERENCES auth.users(id),
 *   player2_id   UUID REFERENCES auth.users(id),
 *   player1_team JSONB,
 *   player2_team JSONB,
 *   state        JSONB    DEFAULT '{}',
 *   status       TEXT     DEFAULT 'waiting',   -- waiting|active|finished
 *   created_at   TIMESTAMPTZ DEFAULT now()
 * );
 *
 * ALTER TABLE battle_rooms ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Players can see their rooms" ON battle_rooms
 *   FOR SELECT USING (auth.uid() IN (player1_id, player2_id));
 *
 * CREATE POLICY "Players can update their rooms" ON battle_rooms
 *   FOR UPDATE USING (auth.uid() IN (player1_id, player2_id));
 *
 * -- Optional: auto-delete rooms older than 2 hours (requires pg_cron extension)
 * -- SELECT cron.schedule(
 * --   'cleanup-battle-rooms',
 * --   '0 * * * *',
 * --   $$DELETE FROM battle_rooms WHERE created_at < NOW() - INTERVAL '2 hours'$$
 * -- );
 *
 * ──────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseConfiguredServer, bearerToken } from '@/lib/supabase/server';
import { readJsonBody } from '@/lib/api/route-helpers';

const MAX_TEAM_SIZE = 6;
const MIN_POKEMON_ID = 1;
const MAX_POKEMON_ID = 1025;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface BattleTeamMember {
  id: number;
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
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const token = bearerToken(req.headers.get('authorization'));
  const supabase = getSupabaseServerClient(token ?? undefined);
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const { data, error } = await supabase
    .from('battle_rooms')
    .insert({
      player1_id: user.id,
      player1_team: safeTeam,
      status: 'waiting',
    })
    .select('id, status, created_at')
    .single();

  if (error) {
    console.error('[battle/room POST]', error);
    return NextResponse.json({ error: 'Failed to create battle room' }, { status: 500 });
  }

  return NextResponse.json({ roomId: data.id, status: data.status, createdAt: data.created_at });
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

  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const token = bearerToken(req.headers.get('authorization'));
  const supabase = getSupabaseServerClient(token ?? undefined);
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RLS will enforce that the user is player1 or player2
  const { data, error } = await supabase
    .from('battle_rooms')
    .select('id, player1_id, player2_id, status, state, created_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to load battle room' }, { status: 500 });
  }

  return NextResponse.json(data);
}
