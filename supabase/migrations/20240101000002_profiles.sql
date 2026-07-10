-- PrimeDex — public profile per user (name as a first-class column)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- The sign-up form stores the name in auth.users.user_metadata; this migration
-- mirrors it into a queryable public.profiles row via an automatic trigger, and
-- backfills any users that already exist.

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  email      text,
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Public profile per user. name is collected at sign-up (auth metadata) and mirrored here.';

-- Keep updated_at fresh (reuses the function from 0001 if present).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile when a new auth user signs up.
-- SECURITY DEFINER so it can write to public.profiles from the auth context.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing users (name taken from metadata if they have one).
insert into public.profiles (id, name, email)
select
  u.id,
  nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
  u.email
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row-Level Security: a user can only see/edit their own profile.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
