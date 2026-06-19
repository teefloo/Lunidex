-- PrimeDex — user data persistence
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query),
-- or via the Supabase CLI (`supabase db push`).
--
-- Model: one JSONB snapshot row per user, keyed by auth.users.id. This mirrors
-- the client's Zustand snapshot (see SYNCED_KEYS in src/store/primedex.ts).
-- Row-Level Security guarantees a user can only read/write their own row.

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.user_state is
  'Per-user PrimeDex snapshot (favorites, caught, TCG collection, quiz, preferences). One row per auth user.';

-- Keep updated_at fresh on every write so the client can do last-write-wins.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_state_set_updated_at on public.user_state;
create trigger user_state_set_updated_at
  before update on public.user_state
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.user_state enable row level security;

-- Drop existing policies first so this script is idempotent.
drop policy if exists "user_state_select_own" on public.user_state;
drop policy if exists "user_state_insert_own" on public.user_state;
drop policy if exists "user_state_update_own" on public.user_state;
drop policy if exists "user_state_delete_own" on public.user_state;

-- (select auth.uid()) is wrapped in a subselect so Postgres evaluates it once
-- per query instead of once per row — a Supabase RLS performance best practice.
create policy "user_state_select_own"
  on public.user_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_state_insert_own"
  on public.user_state
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_state_update_own"
  on public.user_state
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_state_delete_own"
  on public.user_state
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
