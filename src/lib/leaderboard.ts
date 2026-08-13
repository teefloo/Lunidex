/**
 * Shared types and validation for the daily challenge leaderboard.
 *
 * Used by both the API route handler (server-side clamp / anti-cheat) and the
 * client (submission + leaderboard UI). Everything here is framework-agnostic
 * and contains no `any`.
 */

/** Game modes that may submit a leaderboard score. */
export const LEADERBOARD_MODES = ['time-attack', 'survival', 'marathon'] as const;
export type LeaderboardMode = (typeof LEADERBOARD_MODES)[number];

/**
 * The public leaderboard represents the daily challenge, which is the
 * ten-question Marathon/Classic run exposed by the quiz UI. Keep this
 * variant explicit at the boundary so a faster local mode cannot be mixed
 * into the same ranking by forging a request body.
 */
export const DAILY_LEADERBOARD_MODE = 'marathon' as const satisfies LeaderboardMode;

/** Quiz challenges that may submit a leaderboard score. */
export const LEADERBOARD_CHALLENGES = ['classic', 'silhouette', 'stats'] as const;
export type LeaderboardChallenge = (typeof LEADERBOARD_CHALLENGES)[number];

export const DAILY_LEADERBOARD_CHALLENGE = 'classic' as const satisfies LeaderboardChallenge;

/** Leaderboard time windows surfaced as tabs in the UI. */
export const LEADERBOARD_PERIODS = ['day', 'week', 'all'] as const;
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

/** Number of questions in a daily challenge run (see src/app/quiz/page.tsx). */
export const DAILY_QUESTION_COUNT = 10;

/** Points awarded per correct answer, by mode (mirrors the quiz scoring). */
const POINTS_PER_CORRECT: Record<LeaderboardMode, number> = {
  'time-attack': 10,
  survival: 1,
  marathon: 1,
};

/** Default number of rows shown in the leaderboard. */
export const LEADERBOARD_TOP_N = 20;

/** Maximum pseudo length persisted / displayed. */
export const MAX_PSEUDO_LENGTH = 24;

/**
 * Server-side anti-cheat clamp: the maximum score that is physically reachable
 * in a daily run for the given mode. The daily quiz is exactly
 * DAILY_QUESTION_COUNT questions, so the ceiling is questions × points.
 */
export function maxDailyScore(mode: LeaderboardMode): number {
  return DAILY_QUESTION_COUNT * POINTS_PER_CORRECT[mode];
}

/**
 * Coerces an untrusted score into a valid integer within [0, max] for the mode.
 * Returns null when the input cannot be interpreted as a number at all.
 */
export function clampScore(rawScore: unknown, mode: LeaderboardMode): number | null {
  if (
    rawScore === null ||
    rawScore === undefined ||
    typeof rawScore === 'boolean' ||
    (typeof rawScore === 'string' && rawScore.trim() === '')
  ) {
    return null;
  }
  const numeric = typeof rawScore === 'number' ? rawScore : Number(rawScore);
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) return null;
  if (numeric < 0) return 0;
  const max = maxDailyScore(mode);
  return numeric > max ? max : numeric;
}

export function isLeaderboardMode(value: unknown): value is LeaderboardMode {
  return typeof value === 'string' && (LEADERBOARD_MODES as readonly string[]).includes(value);
}

export function isLeaderboardChallenge(value: unknown): value is LeaderboardChallenge {
  return typeof value === 'string' && (LEADERBOARD_CHALLENGES as readonly string[]).includes(value);
}

export function isLeaderboardPeriod(value: unknown): value is LeaderboardPeriod {
  return typeof value === 'string' && (LEADERBOARD_PERIODS as readonly string[]).includes(value);
}

/** Normalises an untrusted pseudo into a safe, trimmed, bounded display name. */
export function sanitizePseudo(rawPseudo: unknown, fallback = 'Trainer'): string {
  const value = typeof rawPseudo === 'string' ? rawPseudo.trim() : '';
  const cleaned = value.replace(/\s+/g, ' ').slice(0, MAX_PSEUDO_LENGTH);
  return cleaned || fallback;
}

/** Today's date as `YYYY-MM-DD` (UTC), matching the daily-quiz seed. */
export function todayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

/** A single leaderboard row as returned by the API and rendered by the UI. */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  pseudo: string;
  score: number;
  date: string;
}

/** Response shape for GET /api/quiz/leaderboard. */
export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  /** Rank of the signed-in user within the full period (null if absent/anon). */
  userRank: number | null;
  /** The signed-in user's best entry for the period (null if absent/anon). */
  userEntry: LeaderboardEntry | null;
}
