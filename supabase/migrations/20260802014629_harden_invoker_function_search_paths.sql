-- Pin the lookup path for invoker functions without changing their bodies,
-- execution mode, or existing privileges.
alter function public.quiz_leaderboard_top(date, integer)
  set search_path = pg_catalog, public;

alter function public.quiz_leaderboard_user_rank(uuid, date)
  set search_path = pg_catalog, public;

alter function public.set_updated_at()
  set search_path = pg_catalog, public;

alter function public.enforce_friendship_transition()
  set search_path = pg_catalog, public;
