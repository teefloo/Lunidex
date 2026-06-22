import { getSupabaseServerClient, isSupabaseConfiguredServer } from '@/lib/supabase/server';
import type { PublicProfile, PublicProfileRow } from '@/types/dashboard';

/**
 * Fetches a public profile by handle. Returns null when Supabase is not
 * configured, the handle is not found, or the profile is not public.
 *
 * This function is designed for use in RSC (server components) where no
 * authentication token is available — it relies on the anonymous Supabase
 * client and the RLS `profiles_select_public` policy.
 */
export async function getPublicProfileByHandle(
  handle: string,
): Promise<PublicProfile | null> {
  if (!isSupabaseConfiguredServer) return null;

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, name, public_handle, is_public, avatar_pokemon_id, caught_count, total_pokemon, unlocked_badges, team_ids, quiz_best_score, quiz_best_streak, quiz_total_correct, tcg_owned_count, caught_by_gen, member_since',
    )
    .eq('public_handle', handle)
    .eq('is_public', true)
    .maybeSingle();

  if (error || !data) return null;

  return rowToPublicProfile(data as PublicProfileRow);
}

/**
 * Fetches the current user's own profile (authenticated). Used in the
 * dashboard to pre-fill the public profile settings.
 */
export async function getOwnPublicProfile(
  accessToken: string,
): Promise<PublicProfile | null> {
  if (!isSupabaseConfiguredServer) return null;

  const supabase = getSupabaseServerClient(accessToken);
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, name, public_handle, is_public, avatar_pokemon_id, caught_count, total_pokemon, unlocked_badges, team_ids, quiz_best_score, quiz_best_streak, quiz_total_correct, tcg_owned_count, caught_by_gen, member_since',
    )
    .maybeSingle();

  if (error || !data) return null;

  return rowToPublicProfile(data as PublicProfileRow);
}

/**
 * Checks if a handle is already taken (by another user).
 */
export async function isHandleTaken(
  handle: string,
  excludeUserId?: string,
): Promise<boolean> {
  if (!isSupabaseConfiguredServer) return false;

  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  let query = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .ilike('public_handle', handle);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { count, error } = await query;

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Updates the current user's public profile settings via the set_public_profile RPC.
 */
export async function setPublicProfile(
  accessToken: string,
  handle: string | null,
  isPublic: boolean,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfiguredServer) {
    return { success: false, error: 'Supabase not configured' };
  }

  const supabase = getSupabaseServerClient(accessToken);
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  const { error } = await supabase.rpc('set_public_profile', {
    p_handle: handle,
    p_is_public: isPublic,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
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
