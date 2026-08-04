'use client';

import { getNeonAccessToken } from '@/lib/neon/client';
import type {
  LeaderboardChallenge,
  LeaderboardMode,
  LeaderboardPeriod,
  LeaderboardResponse,
} from '@/lib/leaderboard';

/** Returns the current Neon JWT, or null when signed out / unconfigured. */
async function getAccessToken(): Promise<string | null> {
  return getNeonAccessToken();
}

export interface SubmitScoreInput {
  mode: LeaderboardMode;
  challenge: LeaderboardChallenge;
  score: number;
}

/**
 * Submits a daily score for the signed-in user. No-ops (returns false) when
 * Neon Auth is unconfigured or the user is not authenticated. The score is
 * re-validated and clamped server-side, so this is best-effort from the client.
 */
export async function submitDailyScore(input: SubmitScoreInput): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  try {
    const res = await fetch('/api/quiz/leaderboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
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
