import { DAILY_QUESTION_COUNT } from '@/lib/leaderboard';

/** The canonical Pokédex range used by the daily leaderboard challenge. */
export const DAILY_POKEMON_COUNT = 1025;

/** Marathon ends after five wrong answers, even before all ten questions. */
export const DAILY_MARATHON_MAX_WRONG = 5;

/** Keep an attempt short-lived so abandoned attempts cannot be completed later. */
export const QUIZ_ATTEMPT_MAX_AGE_MINUTES = 30;

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(index)) | 0;
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    return ((hash ^= hash >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Returns the server-owned question sequence for the daily challenge.
 *
 * Only the current question is returned by the attempt API. Keeping the full
 * sequence in this server-side helper makes the score reproducible while the
 * attempt row remains the authority for which answers are accepted.
 */
export function getDailyQuizQuestionIds(date: string): number[] {
  return Array.from({ length: DAILY_QUESTION_COUNT }, (_, index) => {
    const random = seededRandom(`${date}-${index}`);
    return Math.floor(random() * DAILY_POKEMON_COUNT) + 1;
  });
}

export function isValidQuizAnswerId(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= 1
    && value <= DAILY_POKEMON_COUNT;
}

