-- PrimeDex — daily challenge leaderboard ranking functions
-- Run this in the Supabase SQL Editor after 0002_quiz_scores.sql, or via
-- `supabase db push`.
--
-- These functions push the "best score per user, ranked" computation into
-- Postgres (window functions over an index-friendly date filter) instead of
-- streaming rows to the API and aggregating in JS. This keeps ranks correct at
-- any table size and lets a user's rank be looked up without scanning the top N.
--
-- Both are SECURITY INVOKER (the default): they run with the caller's rights, so
-- the public read policy on quiz_scores applies and no privilege is escalated.

-- Top entries for a period. p_start is the inclusive lower bound on `date`
-- (null = all-time). Returns at most p_limit ranked rows, best score first.
create or replace function public.quiz_leaderboard_top(
  p_start date default null,
  p_limit integer default 20
)
returns table (
  rank    bigint,
  user_id uuid,
  pseudo  text,
  score   integer,
  date    date
)
language sql
stable
as $$
  with best as (
    select distinct on (qs.user_id)
      qs.user_id, qs.pseudo, qs.score, qs.date
    from public.quiz_scores qs
    where p_start is null or qs.date >= p_start
    order by qs.user_id, qs.score desc, qs.date asc
  )
  select
    row_number() over (order by best.score desc, best.date asc) as rank,
    best.user_id, best.pseudo, best.score, best.date
  from best
  order by rank
  limit greatest(p_limit, 0);
$$;

-- A single user's rank within the period (null/no row when they have no score).
create or replace function public.quiz_leaderboard_user_rank(
  p_user uuid,
  p_start date default null
)
returns table (
  rank    bigint,
  user_id uuid,
  pseudo  text,
  score   integer,
  date    date
)
language sql
stable
as $$
  with best as (
    select distinct on (qs.user_id)
      qs.user_id, qs.pseudo, qs.score, qs.date
    from public.quiz_scores qs
    where p_start is null or qs.date >= p_start
    order by qs.user_id, qs.score desc, qs.date asc
  ),
  ranked as (
    select
      row_number() over (order by best.score desc, best.date asc) as rank,
      best.user_id, best.pseudo, best.score, best.date
    from best
  )
  select ranked.rank, ranked.user_id, ranked.pseudo, ranked.score, ranked.date
  from ranked
  where ranked.user_id = p_user;
$$;

-- Leaderboard reads are public, so expose both functions to anon + authenticated.
grant execute on function public.quiz_leaderboard_top(date, integer) to anon, authenticated;
grant execute on function public.quiz_leaderboard_user_rank(uuid, date) to anon, authenticated;
