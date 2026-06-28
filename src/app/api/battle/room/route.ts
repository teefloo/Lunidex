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

  const body = await req.json().catch(() => ({})) as { team?: unknown };

  // Validate team: must be an array of at most 6 plain objects, each with an
  // integer id. Rejects oversized payloads that would bloat the JSONB column.
  const rawTeam = body.team;
  let safeTeam: unknown[] | null = null;
  if (Array.isArray(rawTeam)) {
    if (rawTeam.length > 6) {
      return NextResponse.json({ error: 'Team cannot exceed 6 members' }, { status: 400 });
    }
    if (!rawTeam.every(
      (m) => typeof m === 'object' && m !== null && !Array.isArray(m) &&
             Number.isInteger((m as Record<string, unknown>).id)
    )) {
      return NextResponse.json({ error: 'Invalid team format' }, { status: 400 });
    }
    safeTeam = rawTeam;
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ roomId: data.id, status: data.status, createdAt: data.created_at });
}

// GET /api/battle/room?id=<uuid> — fetch room
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing room id' }, { status: 400 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
