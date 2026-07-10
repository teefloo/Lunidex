-- PrimeDex — public profile extra stats
-- Run this in the Supabase SQL Editor after 20240101000005_public_profiles.sql,
-- or via `supabase db push`.
--
-- Adds three more denormalized columns to public.profiles so the public
-- profile page can show:
--   * best quiz streak              (quiz_best_streak)
--   * TCG cards owned               (tcg_owned_count)
--   * Living Dex breakdown by gen   (caught_by_gen, int[9])
--
-- These mirror user_state.data fields and are kept in sync by the same
-- trigger / RPC machinery introduced in 20240101000005.

-- ---------------------------------------------------------------------------
-- 1. New columns on public.profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists quiz_best_streak integer   not null default 0,
  add column if not exists tcg_owned_count  integer   not null default 0,
  add column if not exists caught_by_gen    integer[] not null default '{0,0,0,0,0,0,0,0,0}';

comment on column public.profiles.quiz_best_streak is
  'Best quiz answer streak, mirrored from user_state.data.bestStreak.';
comment on column public.profiles.tcg_owned_count is
  'Number of owned TCG cards, mirrored from user_state.data.tcgOwnedCards length.';
comment on column public.profiles.caught_by_gen is
  'Caught Pokémon count per generation (index 0 = gen 1 … index 8 = gen 9).';

-- ---------------------------------------------------------------------------
-- 2. Helper: caught_by_generation(jsonb) -> integer[9]
-- ---------------------------------------------------------------------------
-- Counts caught Pokémon IDs into the 9 National Dex generation ranges.
create or replace function public.caught_by_generation(p_caught jsonb)
returns integer[]
language sql
immutable
set search_path = public
as $$
  select array[
    count(*) filter (where v between 1   and 151),
    count(*) filter (where v between 152 and 251),
    count(*) filter (where v between 252 and 386),
    count(*) filter (where v between 387 and 493),
    count(*) filter (where v between 494 and 649),
    count(*) filter (where v between 650 and 721),
    count(*) filter (where v between 722 and 809),
    count(*) filter (where v between 810 and 905),
    count(*) filter (where v between 906 and 1025)
  ]::integer[]
  from (
    select (elem #>> '{}')::int as v
    from jsonb_array_elements(coalesce(p_caught, '[]'::jsonb)) elem
  ) t;
$$;

-- ---------------------------------------------------------------------------
-- 3. Replace the sync trigger function to also fill the new columns
-- ---------------------------------------------------------------------------
create or replace function public.sync_public_profile_from_user_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_data jsonb := NEW.data;
begin
  -- Only sync if the user has a public profile
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE id = NEW.user_id AND is_public = true;

  IF v_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles SET
    caught_count      = COALESCE(jsonb_array_length(v_data -> 'caughtPokemon'), 0),
    caught_by_gen     = public.caught_by_generation(v_data -> 'caughtPokemon'),
    unlocked_badges   = COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(v_data -> 'badges')),
      '{}'
    ),
    team_ids          = COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(v_data -> 'team')::int),
      '{}'
    ),
    quiz_best_score   = GREATEST(
      COALESCE((v_data -> 'quizHighScores' ->> 'classic')::int, 0),
      COALESCE((v_data -> 'quizHighScores' ->> 'silhouette')::int, 0),
      COALESCE((v_data -> 'quizHighScores' ->> 'stats')::int, 0),
      COALESCE((v_data -> 'quizHighScores' ->> 'timeAttack')::int, 0)
    ),
    quiz_best_streak   = COALESCE((v_data ->> 'bestStreak')::int, 0),
    quiz_total_correct = COALESCE((v_data ->> 'totalQuizCorrect')::int, 0),
    tcg_owned_count    = COALESCE(jsonb_array_length(v_data -> 'tcgOwnedCards'), 0),
    avatar_pokemon_id = (
      SELECT (elem #>> '{}')::int
      FROM jsonb_array_elements(v_data -> 'favorites') elem
      LIMIT 1
    ),
    member_since      = COALESCE(member_since, now())
  WHERE id = v_profile_id;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Replace the set_public_profile RPC to also fill the new columns
-- ---------------------------------------------------------------------------
create or replace function public.set_public_profile(
  p_handle text,
  p_is_public boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_result public.profiles;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Validate handle format
  if p_handle is not null and p_handle != '' then
    if length(p_handle) < 3 or length(p_handle) > 30 then
      raise exception 'Handle must be between 3 and 30 characters';
    end if;
    if p_handle !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' then
      raise exception 'Handle must contain only lowercase letters, numbers, and hyphens';
    end if;

    -- Check uniqueness (excluding self)
    if exists (
      select 1 from public.profiles
      where lower(public_handle) = lower(p_handle)
        and id != v_user_id
    ) then
      raise exception 'Handle already taken';
    end if;
  end if;

  -- Update the profile
  update public.profiles set
    public_handle = nullif(trim(p_handle), ''),
    is_public = p_is_public,
    member_since = coalesce(member_since, now())
  where id = v_user_id
  returning * into v_result;

  -- If turning public, trigger an initial sync from user_state
  if p_is_public then
    update public.profiles p set
      caught_count      = coalesce(jsonb_array_length(us.data -> 'caughtPokemon'), 0),
      caught_by_gen     = public.caught_by_generation(us.data -> 'caughtPokemon'),
      unlocked_badges   = coalesce(array(select jsonb_array_elements_text(us.data -> 'badges')), '{}'),
      team_ids          = coalesce(array(select jsonb_array_elements_text(us.data -> 'team')::int), '{}'),
      quiz_best_score   = GREATEST(
        coalesce((us.data -> 'quizHighScores' ->> 'classic')::int, 0),
        coalesce((us.data -> 'quizHighScores' ->> 'silhouette')::int, 0),
        coalesce((us.data -> 'quizHighScores' ->> 'stats')::int, 0),
        coalesce((us.data -> 'quizHighScores' ->> 'timeAttack')::int, 0)
      ),
      quiz_best_streak   = coalesce((us.data ->> 'bestStreak')::int, 0),
      quiz_total_correct = coalesce((us.data ->> 'totalQuizCorrect')::int, 0),
      tcg_owned_count    = coalesce(jsonb_array_length(us.data -> 'tcgOwnedCards'), 0),
      avatar_pokemon_id  = (
        select (elem #>> '{}')::int
        from jsonb_array_elements(us.data -> 'favorites') elem
        limit 1
      )
    from public.user_state us
    where us.user_id = v_user_id and p.id = v_user_id;

    -- Re-read the freshly synced row
    select * into v_result from public.profiles where id = v_user_id;
  end if;

  return v_result;
end;
$$;

grant execute on function public.set_public_profile(text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Backfill existing public profiles
-- ---------------------------------------------------------------------------
update public.profiles p set
  quiz_best_streak = coalesce((us.data ->> 'bestStreak')::int, 0),
  tcg_owned_count  = coalesce(jsonb_array_length(us.data -> 'tcgOwnedCards'), 0),
  caught_by_gen    = public.caught_by_generation(us.data -> 'caughtPokemon')
from public.user_state us
where us.user_id = p.id and p.is_public = true;
