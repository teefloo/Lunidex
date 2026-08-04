import { getNeonClient } from '@/lib/neon/server';
import type { PublicProfile, PublicProfileRow } from '@/types/dashboard';

/**
 * Fetches a public profile by handle. Returns null when Neon is not
 * configured, the handle is not found, or the profile is not public.
 *
 * This function is designed for use in RSC (server components) where no
 * authentication token is available. The public projection deliberately omits
 * account email and private profile settings.
 */
export async function getPublicProfileByHandle(
  handle: string,
): Promise<PublicProfile | null> {
  const sql = getNeonClient();
  if (!sql) return null;

  const rows = await sql`
    select id, name, public_handle, is_public, avatar_pokemon_id,
      caught_count, total_pokemon, unlocked_badges, team_ids,
      quiz_best_score, quiz_best_streak, quiz_total_correct,
      tcg_owned_count, caught_by_gen, member_since
    from public.public_profiles
    where public_handle = ${handle}
      and is_public = true
    limit 1
  ` as PublicProfileRow[];

  const row = rows[0];
  return row ? rowToPublicProfile(row) : null;
}

function rowToPublicProfile(row: PublicProfileRow): PublicProfile {
  const caughtPercent =
    row.total_pokemon > 0
      ? Math.round((row.caught_count / row.total_pokemon) * 100)
      : 0;

  return {
    id: row.id,
    displayName: row.name || 'Trainer',
    handle: row.public_handle,
    avatarPokemonId: row.avatar_pokemon_id,
    caughtCount: row.caught_count,
    totalPokemon: row.total_pokemon,
    caughtPercent,
    unlockedBadges: row.unlocked_badges ?? [],
    teamIds: row.team_ids ?? [],
    quizBestScore: row.quiz_best_score,
    quizBestStreak: row.quiz_best_streak ?? 0,
    quizTotalCorrect: row.quiz_total_correct,
    tcgOwnedCount: row.tcg_owned_count ?? 0,
    caughtByGen: row.caught_by_gen ?? [],
    memberSince: row.member_since,
  };
}
