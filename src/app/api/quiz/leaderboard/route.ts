import { NextRequest, NextResponse } from 'next/server';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import { readJsonBody, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { ensureNeonUser, getNeonUserFromRequest } from '@/lib/neon/auth';
import { getNeonClient } from '@/lib/neon/server';
import {
  DAILY_LEADERBOARD_CHALLENGE,
  DAILY_LEADERBOARD_MODE,
  isLeaderboardPeriod,
  LEADERBOARD_TOP_N,
  sanitizePseudo,
  todayISODate,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type LeaderboardResponse,
} from '@/lib/leaderboard';
import { DAILY_MARATHON_MAX_WRONG, QUIZ_ATTEMPT_MAX_AGE_MINUTES } from '@/lib/quiz-attempt';

/** Row shape returned by the quiz_leaderboard_* RPCs (rank may arrive as bigint). */
interface LeaderboardRpcRow {
  rank: number | string;
  user_id: string;
  pseudo: string;
  score: number;
  date: string;
}

interface SubmitAttemptPayload {
  attemptId?: unknown;
}

interface SubmittedAttemptRow {
  score: number;
  improved: boolean;
}

interface AttemptStateRow {
  status: 'active' | 'completed' | 'expired';
  answer_index: number;
  question_count: number;
  wrong_answers: number;
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
  if (!sql) {
    return NextResponse.json(
      { error: 'Leaderboard unavailable' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

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
        and qs.score between 0 and 10
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
  const activeCurrentUser = currentUser && await ensureNeonUser(sql, currentUser) !== false
    ? currentUser
    : null;
  if (activeCurrentUser) {
    const rankRows = await sql`
      with best as (
        select distinct on (qs.user_id)
          qs.user_id, qs.pseudo, qs.score, qs.date
        from public.quiz_scores qs
        where (${start}::date is null or qs.date >= ${start}::date)
          and qs.mode = ${DAILY_LEADERBOARD_MODE}
          and qs.challenge = ${DAILY_LEADERBOARD_CHALLENGE}
          and qs.score between 0 and 10
        order by qs.user_id, qs.score desc, qs.date asc
      ),
      ranked as (
        select row_number() over (order by best.score desc, best.date asc) as rank,
          best.user_id, best.pseudo, best.score, best.date
        from best
      )
      select rank, user_id, pseudo, score, date
      from ranked
      where user_id = ${activeCurrentUser.id}::uuid
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
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;

  if (!rateLimit(`leaderboard-post:${ipKey(request)}`, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  const user = await getNeonUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  }
  if (await ensureNeonUser(sql, user) === false) {
    return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const body = await readJsonBody<SubmitAttemptPayload>(request);
  if (!body) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  }

  if (typeof body.attemptId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.attemptId)) {
    return NextResponse.json({ error: 'A completed quiz attempt is required' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
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

  const [submittedRows] = await sql.transaction((tx) => [
    tx`
      with claimed as (
        update public.quiz_attempts
        set status = 'completed', completed_at = now(), score = correct_answers
        where id = ${body.attemptId}::uuid
          and user_id = ${user.id}::uuid
          and status = 'active'
          and mode = ${DAILY_LEADERBOARD_MODE}
          and challenge = ${DAILY_LEADERBOARD_CHALLENGE}
          and date = ${today}::date
          and started_at >= now() - (${QUIZ_ATTEMPT_MAX_AGE_MINUTES} * interval '1 minute')
          and (
            answer_index = cardinality(question_ids)
            or wrong_answers >= ${DAILY_MARATHON_MAX_WRONG}
          )
        returning user_id, mode, challenge, score, date
      ), upserted as (
        insert into public.quiz_scores (user_id, pseudo, mode, challenge, score, date)
        select user_id, ${pseudo}, mode, challenge, score, date
        from claimed
        on conflict (user_id, date, mode, challenge) do update
        set score = excluded.score, pseudo = excluded.pseudo
        where excluded.score > public.quiz_scores.score
        returning id
      )
      select claimed.score, exists(select 1 from upserted) as improved
      from claimed
    `,
  ]) as [Array<SubmittedAttemptRow>];

  const result = submittedRows[0] as SubmittedAttemptRow | undefined;
  if (!result || typeof result.score !== 'number') {
    const attemptRows = await sql`
      select status, answer_index, cardinality(question_ids) as question_count,
        wrong_answers, date
      from public.quiz_attempts
      where id = ${body.attemptId}::uuid
        and user_id = ${user.id}::uuid
      limit 1
    ` as AttemptStateRow[];
    const attempt = attemptRows[0];
    if (!attempt) {
      return NextResponse.json({ error: 'Quiz attempt not found' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (attempt.status === 'completed') {
      return NextResponse.json({ error: 'Quiz attempt has already been submitted' }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } });
    }
    return NextResponse.json({ error: 'Quiz attempt is unfinished or expired' }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } });
  }

  return NextResponse.json(
    { ok: true, score: result.score, improved: result.improved },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
