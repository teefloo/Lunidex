import { NextRequest, NextResponse } from 'next/server';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import { readJsonBody } from '@/lib/api/route-helpers';
import { ensureNeonUser, getNeonUserFromRequest } from '@/lib/neon/auth';
import { getNeonClient } from '@/lib/neon/server';
import {
  clampScore,
  DAILY_LEADERBOARD_CHALLENGE,
  DAILY_LEADERBOARD_MODE,
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
  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 404 });

  const periodParam = request.nextUrl.searchParams.get('period') ?? 'day';
  if (!isLeaderboardPeriod(periodParam)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
  }

  const start = periodStartDate(periodParam);

  const data = await sql`
    with best as (
      select distinct on (qs.user_id)
        qs.user_id, qs.pseudo, qs.score, qs.date
      from public.quiz_scores qs
      where (${start}::date is null or qs.date >= ${start}::date)
        and qs.mode = ${DAILY_LEADERBOARD_MODE}
        and qs.challenge = ${DAILY_LEADERBOARD_CHALLENGE}
      order by qs.user_id, qs.score desc, qs.date asc
    )
    select row_number() over (order by best.score desc, best.date asc) as rank,
      best.user_id, best.pseudo, best.score, best.date
    from best
    order by rank
    limit ${LEADERBOARD_TOP_N}
  ` as LeaderboardRpcRow[];
  const entries = data.map(toEntry);

  // Identify the caller (if signed in) to surface their rank, even outside top N.
  let userRank: number | null = null;
  let userEntry: LeaderboardEntry | null = null;
  const currentUser = await getNeonUserFromRequest(request);
  if (currentUser) {
    const rankRows = await sql`
      with best as (
        select distinct on (qs.user_id)
          qs.user_id, qs.pseudo, qs.score, qs.date
        from public.quiz_scores qs
        where (${start}::date is null or qs.date >= ${start}::date)
          and qs.mode = ${DAILY_LEADERBOARD_MODE}
          and qs.challenge = ${DAILY_LEADERBOARD_CHALLENGE}
        order by qs.user_id, qs.score desc, qs.date asc
      ),
      ranked as (
        select row_number() over (order by best.score desc, best.date asc) as rank,
          best.user_id, best.pseudo, best.score, best.date
        from best
      )
      select rank, user_id, pseudo, score, date
      from ranked
      where user_id = ${currentUser.id}::uuid
      limit 1
    ` as LeaderboardRpcRow[];
    const row = rankRows[0];
    if (row) {
      userEntry = toEntry(row);
      userRank = userEntry.rank;
    }
  }

  const response: LeaderboardResponse = {
    period: periodParam,
    entries,
    userRank,
    userEntry,
  };
  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!rateLimit(`leaderboard-post:${ipKey(request)}`, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 404 });
  const user = await getNeonUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  await ensureNeonUser(sql, user);

  const body = await readJsonBody<{ mode?: unknown; challenge?: unknown; score?: unknown }>(request);
  if (!body) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (!isLeaderboardMode(body.mode) || !isLeaderboardChallenge(body.challenge)) {
    return NextResponse.json({ error: 'Invalid mode or challenge' }, { status: 400 });
  }

  if (
    body.mode !== DAILY_LEADERBOARD_MODE ||
    body.challenge !== DAILY_LEADERBOARD_CHALLENGE
  ) {
    return NextResponse.json(
      { error: 'Only the daily Marathon Classic challenge is eligible for this leaderboard' },
      { status: 400 },
    );
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
  // The quiz seed and GET period windows are UTC-based. Use the same explicit
  // date for writes so a database session configured outside UTC cannot place
  // a score in a different leaderboard day around midnight.
  const today = todayISODate();

  const [insertedRows, currentRows] = await sql.transaction((tx) => [
    tx`
      insert into public.quiz_scores (user_id, pseudo, mode, challenge, score, date)
      values (${user.id}::uuid, ${pseudo}, ${body.mode}, ${body.challenge}, ${score}, ${today}::date)
      on conflict (user_id, date, mode, challenge) do update
      set score = excluded.score, pseudo = excluded.pseudo
      where excluded.score > public.quiz_scores.score
      returning score
    `,
    tx`
      select score
      from public.quiz_scores
      where user_id = ${user.id}::uuid
        and date = ${today}::date
        and mode = ${body.mode}
        and challenge = ${body.challenge}
      limit 1
    `,
  ]) as [Array<{ score: number }>, Array<{ score: number }>];

  const result = insertedRows[0] ?? currentRows[0];
  if (!result || typeof result.score !== 'number') {
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, score: result.score, improved: insertedRows.length > 0 });
}
