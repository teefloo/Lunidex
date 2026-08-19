import { NextRequest, NextResponse } from 'next/server';

import { readJsonBody, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { ensureNeonUser, getNeonUserFromRequest } from '@/lib/neon/auth';
import { getNeonClient } from '@/lib/neon/server';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import {
  DAILY_LEADERBOARD_CHALLENGE,
  DAILY_LEADERBOARD_MODE,
  todayISODate,
} from '@/lib/leaderboard';
import {
  DAILY_MARATHON_MAX_WRONG,
  getDailyQuizQuestionIds,
  isValidQuizAnswerId,
  QUIZ_ATTEMPT_MAX_AGE_MINUTES,
} from '@/lib/quiz-attempt';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface AttemptPayload {
  action?: unknown;
  mode?: unknown;
  challenge?: unknown;
  attemptId?: unknown;
  questionIndex?: unknown;
  answerId?: unknown;
}

interface NewAttemptRow {
  id: string;
  question_id: number;
}

interface AnswerRow {
  attempt_id: string;
  answer_index: number;
  correct: boolean;
  ready_to_submit: boolean;
  next_question_id: number | null;
}

function noStoreHeaders(): HeadersInit {
  return { 'Cache-Control': 'private, no-store' };
}

function invalidAttempt(): NextResponse {
  return NextResponse.json(
    { error: 'Quiz attempt is missing, invalid, or no longer available' },
    { status: 409, headers: noStoreHeaders() },
  );
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;

  if (!rateLimit(`quiz-attempt:${ipKey(request)}`, 30)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: noStoreHeaders() });
  }

  const sql = getNeonClient();
  if (!sql) {
    return NextResponse.json({ error: 'Quiz leaderboard unavailable' }, { status: 503, headers: noStoreHeaders() });
  }

  const user = await getNeonUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: noStoreHeaders() });
  }

  if (await ensureNeonUser(sql, user) === false) {
    return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: noStoreHeaders() });
  }

  const payload = await readJsonBody<AttemptPayload>(request);
  if (!payload || (payload.action !== 'start' && payload.action !== 'answer')) {
    return NextResponse.json({ error: 'Invalid quiz attempt action' }, { status: 400, headers: noStoreHeaders() });
  }

  if (payload.action === 'start') {
    if (payload.mode !== DAILY_LEADERBOARD_MODE || payload.challenge !== DAILY_LEADERBOARD_CHALLENGE) {
      return NextResponse.json(
        { error: 'Only the daily Marathon Classic challenge can create a leaderboard attempt' },
        { status: 400, headers: noStoreHeaders() },
      );
    }

    const today = todayISODate();
    const questionIds = getDailyQuizQuestionIds(today);
    const rows = await sql`
      insert into public.quiz_attempts (
        user_id, mode, challenge, date, question_ids
      )
      values (
        ${user.id}::uuid,
        ${DAILY_LEADERBOARD_MODE},
        ${DAILY_LEADERBOARD_CHALLENGE},
        ${today}::date,
        ${questionIds}::integer[]
      )
      returning id, question_ids[1] as question_id
    ` as NewAttemptRow[];
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: 'Failed to create quiz attempt' }, { status: 500, headers: noStoreHeaders() });
    }

    return NextResponse.json(
      {
        attemptId: row.id,
        questionIndex: 0,
        questionId: Number(row.question_id),
        questionCount: questionIds.length,
      },
      { headers: noStoreHeaders() },
    );
  }

  if (!isUuid(payload.attemptId) || !Number.isInteger(payload.questionIndex) || payload.questionIndex < 0 || payload.questionIndex >= 10 || !isValidQuizAnswerId(payload.answerId)) {
    return NextResponse.json({ error: 'Invalid quiz answer' }, { status: 400, headers: noStoreHeaders() });
  }

  const today = todayISODate();
  const rows = await sql`
    update public.quiz_attempts
    set
      answer_index = answer_index + 1,
      correct_answers = correct_answers + case
        when question_ids[answer_index + 1] = ${payload.answerId} then 1
        else 0
      end,
      wrong_answers = wrong_answers + case
        when question_ids[answer_index + 1] = ${payload.answerId} then 0
        else 1
      end
    where id = ${payload.attemptId}::uuid
      and user_id = ${user.id}::uuid
      and status = 'active'
      and date = ${today}::date
      and started_at >= now() - (${QUIZ_ATTEMPT_MAX_AGE_MINUTES} * interval '1 minute')
      and answer_index = ${payload.questionIndex}
      and answer_index < cardinality(question_ids)
    returning
      id as attempt_id,
      answer_index,
      case when answer_index < cardinality(question_ids)
        then question_ids[answer_index + 1]
        else null
      end as next_question_id,
      correct_answers,
      wrong_answers,
      question_ids[answer_index] = ${payload.answerId} as correct,
      (
        answer_index >= cardinality(question_ids)
        or wrong_answers >= ${DAILY_MARATHON_MAX_WRONG}
      ) as ready_to_submit
  ` as Array<AnswerRow & { correct_answers: number; wrong_answers: number }>;

  const row = rows[0];
  if (!row) return invalidAttempt();

  // `answer_index` now points at the next question. Do not expose the answer
  // key itself; returning only the next question preserves the server-owned
  // answer comparison while keeping the client UI responsive.
  return NextResponse.json(
    {
      ok: true,
      attemptId: row.attempt_id,
      questionIndex: row.answer_index,
      correct: row.correct,
      readyToSubmit: row.ready_to_submit,
      nextQuestionId: row.ready_to_submit ? null : Number(row.next_question_id),
    },
    { headers: noStoreHeaders() },
  );
}
