import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { ensureNeonUser, getNeonUserFromRequest } from '@/lib/neon/auth';
import { isInactiveAccountError } from '@/lib/neon/errors';
import { getNeonClient, type NeonSql } from '@/lib/neon/server';
import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH, HANDLE_REGEX } from '@/types/dashboard';

interface ProfileSettingsRow {
  public_handle: string | null;
  is_public: boolean;
}

interface ProfilePayload {
  handle?: unknown;
  isPublic?: unknown;
}

function unavailable(): NextResponse {
  return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: unknown }).code === '23505';
}

function normalizeHandle(value: unknown): string | null | undefined {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  return value.trim().toLowerCase();
}

async function getOwnSettings(
  sql: NeonSql,
  userId: string,
): Promise<ProfileSettingsRow | null> {
  const rows = await sql`
    select public_handle, is_public
    from public.profiles
    where id = ${userId}::uuid
    limit 1
  ` as ProfileSettingsRow[];
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
  return NextResponse.json({ profile: await getOwnSettings(sql, user.id) }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;

  const sql = getNeonClient();
  if (!sql) return unavailable();

  const user = await getNeonUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const payload = await readJsonBody<ProfilePayload>(request);
  if (!payload || typeof payload.isPublic !== 'boolean') {
    return NextResponse.json({ error: 'Invalid profile payload' }, { status: 400 });
  }

  const handle = normalizeHandle(payload.handle);
  if (handle === undefined) {
    return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
  }
  if (handle !== null && (handle.length < HANDLE_MIN_LENGTH || handle.length > HANDLE_MAX_LENGTH || !HANDLE_REGEX.test(handle))) {
    return NextResponse.json({ error: 'Handle must contain only lowercase letters, numbers, and hyphens' }, { status: 400 });
  }
  if (payload.isPublic && !handle) {
    return NextResponse.json({ error: 'A public profile requires a handle' }, { status: 400 });
  }

  if (await ensureNeonUser(sql, user) === false) {
    return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  }

  let updatedRows: ProfileSettingsRow[];
  try {
    updatedRows = await sql`
      update public.profiles
      set public_handle = ${handle},
          is_public = ${payload.isPublic},
          member_since = coalesce(member_since, now())
      where id = ${user.id}::uuid
      returning public_handle, is_public
    ` as ProfileSettingsRow[];
  } catch (error) {
    if (isInactiveAccountError(error)) {
      return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: 'Handle already taken' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  if (!updatedRows[0]) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Preserve the behavior of the former set_public_profile RPC: when a profile becomes public,
  // refresh its denormalized counters from the user's current state snapshot.
  if (payload.isPublic) {
    try {
      await sql`
        update public.profiles p
        set caught_count = coalesce(jsonb_array_length(us.data -> 'caughtPokemon'), 0),
            caught_by_gen = public.caught_by_generation(us.data -> 'caughtPokemon'),
            unlocked_badges = coalesce(array(select jsonb_array_elements_text(us.data -> 'badges')), '{}'),
            team_ids = coalesce(array(select jsonb_array_elements_text(us.data -> 'team')::int), '{}'),
            quiz_best_score = greatest(
              coalesce((us.data -> 'quizHighScores' ->> 'classic')::int, 0),
              coalesce((us.data -> 'quizHighScores' ->> 'silhouette')::int, 0),
              coalesce((us.data -> 'quizHighScores' ->> 'stats')::int, 0),
              coalesce((us.data -> 'quizHighScores' ->> 'timeAttack')::int, 0)
            ),
            quiz_best_streak = coalesce((us.data ->> 'bestStreak')::int, 0),
            quiz_total_correct = coalesce((us.data ->> 'totalQuizCorrect')::int, 0),
            tcg_owned_count = public.distinct_tcg_owned_count(us.data -> 'tcgOwnedCards'),
            avatar_pokemon_id = (
              select (elem #>> '{}')::int
              from jsonb_array_elements(coalesce(us.data -> 'favorites', '[]'::jsonb)) elem
              limit 1
            )
        from public.user_state us
        where p.id = ${user.id}::uuid
          and us.user_id = p.id
      `;
    } catch (error) {
      if (isInactiveAccountError(error)) {
        return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
      }
      return NextResponse.json({ error: 'Failed to refresh profile' }, { status: 500 });
    }
  }

  return NextResponse.json({ profile: updatedRows[0] }, { headers: { 'Cache-Control': 'private, no-store' } });
}
