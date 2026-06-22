-- PrimeDex — daily challenge leaderboard
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query),
-- or via the Supabase CLI (`supabase db push`).
--
-- Model: one best score per user, per day, per (mode, challenge). The daily
-- quiz submits a single row when a signed-in user finishes; reads are public so
-- anyone can browse the leaderboard. Row-Level Security guarantees a user can
-- only write a row for themselves (auth.uid() = user_id) — never for others.

create table if not exists public.quiz_scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  pseudo     text not null,
  mode       text not null,
  challenge  text not null,
  score      integer not null default 0,
  date       date not null default current_date,
  created_at timestamptz not null default now(),
  -- One persisted best score per user / day / game variant. Upserts on this key
  -- keep the highest score (see the API route handler).
  unique (user_id, date, mode, challenge)
);

comment on table public.quiz_scores is
  'Daily challenge leaderboard entries. Public read, owner-only write (RLS).';

-- Leaderboard reads sort by score within a date window, so index (date, score desc).
create index if not exists quiz_scores_date_score_idx
  on public.quiz_scores (date, score desc);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.quiz_scores enable row level security;

-- Drop existing policies first so this script is idempotent.
drop policy if exists "quiz_scores_select_public" on public.quiz_scores;
drop policy if exists "quiz_scores_insert_own" on public.quiz_scores;
drop policy if exists "quiz_scores_update_own" on public.quiz_scores;

-- Public read: anyone (anonymous or authenticated) can browse the leaderboard.
create policy "quiz_scores_select_public"
  on public.quiz_scores
  for select
  to anon, authenticated
  using (true);

-- Write is restricted to the authenticated owner. The `with check` clause is
-- what prevents writing a score on behalf of another user.
-- (select auth.uid()) is wrapped in a subselect so Postgres evaluates it once
-- per statement instead of once per row — a Supabase RLS performance best practice.
create policy "quiz_scores_insert_own"
  on public.quiz_scores
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Upserts (keep best score) need update on the user's own rows.
create policy "quiz_scores_update_own"
  on public.quiz_scores
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
