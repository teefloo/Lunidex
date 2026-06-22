-- PrimeDex — public profiles
-- Run this in the Supabase SQL Editor after 0003_quiz_leaderboard_rpc.sql,
-- or via `supabase db push`.
--
-- Adds opt-in public profile support: a unique handle, a public flag, and
-- denormalized columns that mirror the most important user_state data so the
-- public profile page can be served without reading the JSONB blob.
--
-- RLS: only the owner can see non-public profiles; anonymous/authenticated
-- users can read the public columns of profiles where is_public = true.

-- ---------------------------------------------------------------------------
-- 1. New columns on existing public.profiles
-- ---------------------------------------------------------------------------
-- Add created_at if it doesn't exist (needed for member_since fallback)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'created_at') then
    alter table public.profiles add column created_at timestamptz not null default now();
  end if;
end $$;

alter table public.profiles
  add column if not exists public_handle    text,
  add column if not exists is_public        boolean not null default false,
  add column if not exists avatar_pokemon_id integer,
  add column if not exists caught_count     integer not null default 0,
  add column if not exists total_pokemon    integer not null default 1025,
  add column if not exists unlocked_badges  text[] not null default '{}',
  add column if not exists team_ids         integer[] not null default '{}',
  add column if not exists quiz_best_score  integer not null default 0,
  add column if not exists quiz_total_correct integer not null default 0,
  add column if not exists member_since     timestamptz;

-- Unique handle (case-insensitive enforced via lowercase check + unique index).
alter table public.profiles
  add constraint profiles_public_handle_format
    check (public_handle is null or (length(public_handle) >= 3 and length(public_handle) <= 30 and public_handle ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'));

create unique index if not exists profiles_public_handle_unique
  on public.profiles (lower(public_handle))
  where public_handle is not null;

comment on column public.profiles.public_handle is
  'Unique public slug (3-30 lowercase alphanumeric/dash). NULL = no public handle.';
comment on column public.profiles.is_public is
  'Opt-in flag: when true the profile is visible at /u/{handle}.';

-- ---------------------------------------------------------------------------
-- 2. Trigger function: sync public columns from user_state.data
-- ---------------------------------------------------------------------------
-- Called after an UPDATE on user_state. Extracts the relevant fields from the
-- JSONB `data` column and writes them to the denormalized profile columns.
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
    quiz_total_correct = COALESCE((v_data ->> 'totalQuizCorrect')::int, 0),
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

drop trigger if exists sync_public_profile on public.user_state;
create trigger sync_public_profile
  after update of data on public.user_state
  for each row
  execute function public.sync_public_profile_from_user_state();

-- Also trigger on INSERT (first sync)
drop trigger if exists sync_public_profile_insert on public.user_state;
create trigger sync_public_profile_insert
  after insert on public.user_state
  for each row
  execute function public.sync_public_profile_from_user_state();

-- ---------------------------------------------------------------------------
-- 3. RPC: set_public_profile(handle, is_public)
-- ---------------------------------------------------------------------------
-- Allows the authenticated user to toggle their public profile and set their handle.
-- Returns the full profile row on success, null on failure.
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
    update public.profiles set
      caught_count      = coalesce(
        (select jsonb_array_length(us.data -> 'caughtPokemon') from public.user_state us where us.user_id = v_user_id),
        0
      ),
      unlocked_badges   = coalesce(
        (select array(select jsonb_array_elements_text(us.data -> 'badges')) from public.user_state us where us.user_id = v_user_id),
        '{}'
      ),
      team_ids          = coalesce(
        (select array(select jsonb_array_elements_text(us.data -> 'team')::int) from public.user_state us where us.user_id = v_user_id),
        '{}'
      ),
      quiz_best_score   = GREATEST(
        coalesce((select (us.data -> 'quizHighScores' ->> 'classic')::int from public.user_state us where us.user_id = v_user_id), 0),
        coalesce((select (us.data -> 'quizHighScores' ->> 'silhouette')::int from public.user_state us where us.user_id = v_user_id), 0),
        coalesce((select (us.data -> 'quizHighScores' ->> 'stats')::int from public.user_state us where us.user_id = v_user_id), 0),
        coalesce((select (us.data -> 'quizHighScores' ->> 'timeAttack')::int from public.user_state us where us.user_id = v_user_id), 0)
      ),
      quiz_total_correct = coalesce(
        (select (us.data ->> 'totalQuizCorrect')::int from public.user_state us where us.user_id = v_user_id),
        0
      ),
      avatar_pokemon_id = (
        select (elem #>> '{}')::int
        from jsonb_array_elements((select us.data -> 'favorites' from public.user_state us where us.user_id = v_user_id)) elem
        limit 1
      )
    where id = v_user_id;
  end if;

  return v_result;
end;
$$;

-- Grant execute to authenticated users only
grant execute on function public.set_public_profile(text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS policies
-- ---------------------------------------------------------------------------
-- The existing policies (profiles_select_own, profiles_insert_own, profiles_update_own)
-- still apply: the owner can always see and edit their own profile.

-- New policy: anyone can read profiles where is_public = true
-- We use a SECURITY DEFINER view approach via a new SELECT policy.
-- We only expose the public columns through the API by using a column-level
-- restriction approach: the application layer must select only public columns
-- for anonymous queries. RLS ensures row-level access.

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select
  to anon, authenticated
  using (is_public = true);

-- Note: the owner's own policy (profiles_select_own) already covers
-- authenticated users reading their own row regardless of is_public.
-- Both policies are evaluated with OR (any matching policy grants access).

-- ---------------------------------------------------------------------------
-- 5. Index for handle lookups
-- ---------------------------------------------------------------------------
create index if not exists profiles_handle_lookup
  on public.profiles (lower(public_handle))
  where public_handle is not null and is_public = true;
