import { NextRequest, NextResponse } from 'next/server';
import {
  bearerToken,
  getSupabaseServerClient,
  isSupabaseConfiguredServer,
} from '@/lib/supabase/server';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import { readJsonBody } from '@/lib/api/route-helpers';
import {
  clampScore,
  isLeaderboardChallenge,
  isLeaderboardMode,
  isLeaderboardPeriod,
  LEADERBOARD_TOP_N,
  sanitizePseudo,
  todayISODate,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type LeaderboardResponse,
} from '@/lib/leaderboard';

/** Row shape returned by the quiz_leaderboard_* RPCs (rank may arrive as bigint). */
interface LeaderboardRpcRow {
  rank: number | string;
  user_id: string;
  pseudo: string;
  score: number;
  date: string;
}

/** Earliest date (inclusive) to include for a given period, or null for all-time. */
function periodStartDate(period: LeaderboardPeriod): string | null {
  if (period === 'all') return null;
  const days = period === 'day' ? 0 : 6;
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);
  return start.toISOString().split('T')[0];
}

function toEntry(row: LeaderboardRpcRow): LeaderboardEntry {
  return {
    rank: Number(row.rank),
    userId: row.user_id,
    pseudo: row.pseudo,
    score: row.score,
    date: row.date,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 404 });
  }

  const periodParam = request.nextUrl.searchParams.get('period') ?? 'day';
  if (!isLeaderboardPeriod(periodParam)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 404 });
  }

  const start = periodStartDate(periodParam);

  // Ranking is done in Postgres (window functions over best-per-user) so ranks
  // stay correct regardless of table size — see migration 0003.
  const { data, error } = await supabase.rpc('quiz_leaderboard_top', {
    p_start: start,
    p_limit: LEADERBOARD_TOP_N,
  });
  if (error) {
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }

  const entries = ((data as LeaderboardRpcRow[] | null) ?? []).map(toEntry);

  // Identify the caller (if signed in) to surface their rank, even outside top N.
  let userRank: number | null = null;
  let userEntry: LeaderboardEntry | null = null;
  const token = bearerToken(request.headers.get('authorization'));
  if (token) {
    const authed = getSupabaseServerClient(token);
    const { data: userData } = (await authed?.auth.getUser()) ?? { data: { user: null } };
    const userId = userData?.user?.id ?? null;
    if (userId) {
      const { data: rankData } = await supabase.rpc('quiz_leaderboard_user_rank', {
        p_user: userId,
        p_start: start,
      });
      const row = Array.isArray(rankData) ? (rankData[0] as LeaderboardRpcRow | undefined) : undefined;
      if (row) {
        userEntry = toEntry(row);
        userRank = userEntry.rank;
      }
    }
  }

  const response: LeaderboardResponse = {
    period: periodParam,
    entries,
    userRank,
    userEntry,
  };
  return NextResponse.json(response);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!rateLimit(`leaderboard-post:${ipKey(request)}`, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 404 });
  }

  const token = bearerToken(request.headers.get('authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient(token);
  if (!supabase) {
    return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 404 });
  }

  // Resolve the user from the token — never trust a user_id from the body.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await readJsonBody<{ mode?: unknown; challenge?: unknown; score?: unknown }>(request);
  if (!body) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (!isLeaderboardMode(body.mode) || !isLeaderboardChallenge(body.challenge)) {
    return NextResponse.json({ error: 'Invalid mode or challenge' }, { status: 400 });
  }

  const score = clampScore(body.score, body.mode);
  if (score === null) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
  }

  // Pseudo is derived server-side from the account profile, not from the body.
  const metadata = user.user_metadata ?? {};
  const profileName =
    (typeof metadata.name === 'string' && metadata.name) ||
    (typeof metadata.display_name === 'string' && metadata.display_name) ||
    user.email?.split('@')[0] ||
    '';
  const pseudo = sanitizePseudo(profileName);

  const date = todayISODate();

  // Keep the best score for the day: only write when we'd improve on the
  // existing row. RLS still guarantees the row belongs to this user.
  const { data: existing } = await supabase
    .from('quiz_scores')
    .select('score')
    .eq('user_id', user.id)
    .eq('date', date)
    .eq('mode', body.mode)
    .eq('challenge', body.challenge)
    .maybeSingle();

  const existingScore = typeof existing?.score === 'number' ? existing.score : null;
  if (existingScore !== null && existingScore >= score) {
    return NextResponse.json({ ok: true, score: existingScore, improved: false });
  }

  const { error: upsertError } = await supabase
    .from('quiz_scores')
    .upsert(
      {
        user_id: user.id,
        pseudo,
        mode: body.mode,
        challenge: body.challenge,
        score,
        date,
      },
      { onConflict: 'user_id,date,mode,challenge' },
    );

  if (upsertError) {
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, score, improved: true });
}

