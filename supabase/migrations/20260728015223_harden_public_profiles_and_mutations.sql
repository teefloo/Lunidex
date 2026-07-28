-- PrimeDex — additive security hardening for public profiles, leaderboard
-- writes, and battle-room mutations. This file is intentionally not deployed
-- by the application; run it through the normal reviewed Supabase migration
-- workflow after exercising it against an isolated project.

-- ---------------------------------------------------------------------------
-- Public profile projection
-- ---------------------------------------------------------------------------
-- A table-level SELECT grant overrides a column-level email revoke. Keep the
-- base table for authenticated owners only and expose an intentionally finite
-- projection for anonymous/public reads.
revoke all on table public.profiles from anon;
revoke select on table public.profiles from authenticated;

grant select (
  id,
  name,
  updated_at,
  created_at,
  public_handle,
  is_public,
  avatar_pokemon_id,
  caught_count,
  total_pokemon,
  unlocked_badges,
  team_ids,
  quiz_best_score,
  quiz_total_correct,
  member_since,
  quiz_best_streak,
  tcg_owned_count,
  caught_by_gen,
  allow_friend_requests,
  share_tcg_collection,
  share_tcg_decks
) on table public.profiles to authenticated;

create or replace view public.public_profiles
with (security_barrier = true)
as
select
  id,
  name,
  public_handle,
  is_public,
  avatar_pokemon_id,
  caught_count,
  total_pokemon,
  unlocked_badges,
  team_ids,
  quiz_best_score,
  quiz_best_streak,
  quiz_total_correct,
  tcg_owned_count,
  caught_by_gen,
  member_since
from public.profiles
where is_public = true;

revoke all on table public.public_profiles from public;
grant select on table public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'Safe public profile projection; deliberately omits account email and private columns.';

-- ---------------------------------------------------------------------------
-- Atomic leaderboard submission
-- ---------------------------------------------------------------------------
-- Direct table mutation lets an authenticated browser bypass server validation.
-- Keep public reads but force writes through a constrained, atomic RPC.
revoke insert, update, delete on table public.quiz_scores from anon, authenticated;
drop policy if exists "quiz_scores_insert_own" on public.quiz_scores;
drop policy if exists "quiz_scores_update_own" on public.quiz_scores;

create or replace function public.submit_quiz_score(
  p_mode text,
  p_challenge text,
  p_score integer,
  p_pseudo text
)
returns table(score integer, improved boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_max_score integer;
  v_score integer;
  v_pseudo text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_mode not in ('time-attack', 'survival', 'marathon')
    or p_challenge not in ('classic', 'silhouette', 'stats') then
    raise exception 'Invalid leaderboard variant';
  end if;

  v_max_score := case p_mode when 'time-attack' then 100 else 10 end;
  if p_score is null or p_score < 0 or p_score > v_max_score then
    raise exception 'Invalid score';
  end if;

  v_score := p_score;
  v_pseudo := left(nullif(regexp_replace(trim(coalesce(p_pseudo, '')), '\\s+', ' ', 'g'), ''), 24);
  v_pseudo := coalesce(v_pseudo, 'Trainer');

  insert into public.quiz_scores (user_id, pseudo, mode, challenge, score, date)
  values (v_user_id, v_pseudo, p_mode, p_challenge, v_score, current_date)
  on conflict (user_id, date, mode, challenge) do update
    set score = excluded.score,
        pseudo = excluded.pseudo
    where excluded.score > public.quiz_scores.score
  returning public.quiz_scores.score, true into score, improved;

  if found then
    return next;
    return;
  end if;

  select qs.score, false
    into score, improved
  from public.quiz_scores qs
  where qs.user_id = v_user_id
    and qs.date = current_date
    and qs.mode = p_mode
    and qs.challenge = p_challenge;
  return next;
end;
$$;

revoke all on function public.submit_quiz_score(text, text, integer, text) from public;
grant execute on function public.submit_quiz_score(text, text, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Battle rooms
-- ---------------------------------------------------------------------------
-- No shipped client writes persistent battle state. Remove the broad direct
-- UPDATE capability until a per-player transition RPC is introduced. Realtime
-- chat/presence and room creation/read remain unchanged.
revoke update on table public.battle_rooms from anon, authenticated;
drop policy if exists "Players can update their rooms" on public.battle_rooms;

drop policy if exists "Authenticated users can create rooms" on public.battle_rooms;
create policy "Authenticated users can create rooms"
  on public.battle_rooms for insert
  to authenticated
  with check ((select auth.uid()) = player1_id and player2_id is null);
