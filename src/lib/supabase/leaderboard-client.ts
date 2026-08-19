'use client';

import { getNeonAccessToken } from '@/lib/neon/client';
import type {
  LeaderboardPeriod,
  LeaderboardResponse,
} from '@/lib/leaderboard';

/** Returns the current Neon JWT, or null when signed out / unconfigured. */
async function getAccessToken(): Promise<string | null> {
  return getNeonAccessToken();
}

interface QuizAttemptStartResponse {
  attemptId?: unknown;
  questionId?: unknown;
}

interface QuizAttemptAnswerResponse {
  attemptId?: unknown;
  questionIndex?: unknown;
  correct?: unknown;
  readyToSubmit?: unknown;
  nextQuestionId?: unknown;
}

function isValidQuestionId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1025;
}

function isValidQuestionIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10;
}

export interface DailyQuizAttempt {
  attemptId: string;
  questionId: number;
}

export interface DailyQuizAnswerResult {
  attemptId: string;
  questionIndex: number;
  correct: boolean;
  readyToSubmit: boolean;
  nextQuestionId: number | null;
}

/**
 * Starts a server-tracked daily attempt for the signed-in user. No-ops
 * (returns null) when Neon Auth is unconfigured or the user is not authenticated.
 */
export async function startDailyQuizAttempt(): Promise<DailyQuizAttempt | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/quiz/attempt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'start', mode: 'marathon', challenge: 'classic' }),
    });
    if (!res.ok) return null;
    const body = await res.json() as QuizAttemptStartResponse;
    if (typeof body.attemptId !== 'string' || !isValidQuestionId(body.questionId)) return null;
    return { attemptId: body.attemptId, questionId: body.questionId };
  } catch {
    return null;
  }
}

export async function answerDailyQuizQuestion(input: {
  attemptId: string;
  questionIndex: number;
  answerId: number;
}): Promise<DailyQuizAnswerResult | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/quiz/attempt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'answer', ...input }),
    });
    if (!res.ok) return null;
    const body = await res.json() as QuizAttemptAnswerResponse;
    const nextQuestionId = body.nextQuestionId;
    if (
      typeof body.attemptId !== 'string'
      || body.attemptId !== input.attemptId
      || !isValidQuestionIndex(body.questionIndex)
      || typeof body.correct !== 'boolean'
      || typeof body.readyToSubmit !== 'boolean'
      || (nextQuestionId !== null && !isValidQuestionId(nextQuestionId))
    ) return null;
    return {
      attemptId: body.attemptId,
      questionIndex: body.questionIndex,
      correct: body.correct,
      readyToSubmit: body.readyToSubmit,
      nextQuestionId,
    };
  } catch {
    return null;
  }
}

/** Finalizes a server-tracked attempt; the server derives the score. */
export async function submitDailyAttempt(attemptId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  try {
    const res = await fetch('/api/quiz/leaderboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ attemptId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches a leaderboard page. Forwards the access token when available so the
 * response includes the caller's own rank. Returns null on any failure.
 */
export async function fetchLeaderboard(
  period: LeaderboardPeriod,
): Promise<LeaderboardResponse | null> {
  const token = await getAccessToken();

  try {
    const res = await fetch(`/api/quiz/leaderboard?period=${period}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as LeaderboardResponse;
  } catch {
    return null;
  }
}
