-- PrimeDex — additive hardening for functions created before this migration.
--
-- This migration deliberately does not alter historical migration files. It is
-- safe to apply to an already-migrated database after pg_cron has been enabled
-- through Supabase Dashboard > Integrations > Cron. Failing closed when the
-- extension is absent prevents silently deploying a 90-day retention promise
-- with no scheduler behind it.

-- Every SECURITY DEFINER function must have a deterministic lookup path and
-- an explicit execution surface. Trigger functions do not need EXECUTE grants:
-- PostgreSQL invokes them through their attached triggers.
alter function public.handle_new_user() set search_path = pg_catalog, public;
alter function public.sync_public_profile_from_user_state() set search_path = pg_catalog, public;
alter function public.set_public_profile(text, boolean) set search_path = pg_catalog, public;
alter function public.sync_friend_directory() set search_path = pg_catalog, public;
alter function public.sync_friend_snapshots() set search_path = pg_catalog, public;
alter function public.send_friend_request(text) set search_path = pg_catalog, public;
alter function public.respond_to_friend_request(uuid, text) set search_path = pg_catalog, public;
alter function public.submit_quiz_score(text, text, integer, text) set search_path = pg_catalog, public;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_public_profile_from_user_state() from public, anon, authenticated;
revoke all on function public.sync_friend_directory() from public, anon, authenticated;
revoke all on function public.sync_friend_snapshots() from public, anon, authenticated;

revoke all on function public.set_public_profile(text, boolean) from public, anon, authenticated;
grant execute on function public.set_public_profile(text, boolean) to authenticated;
revoke all on function public.send_friend_request(text) from public, anon, authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
revoke all on function public.respond_to_friend_request(uuid, text) from public, anon, authenticated;
grant execute on function public.respond_to_friend_request(uuid, text) to authenticated;
revoke all on function public.submit_quiz_score(text, text, integer, text) from public, anon, authenticated;
grant execute on function public.submit_quiz_score(text, text, integer, text) to authenticated;

-- The original responder relied on a non-matching UPDATE predicate when there
-- was no JWT. Make the authentication boundary explicit before the privileged
-- UPDATE, while retaining the participant predicate below.
create or replace function public.respond_to_friend_request(
  p_friendship_id uuid,
  p_action text
)
returns public.friendships
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_result public.friendships;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_action not in ('accept', 'decline') then
    raise exception 'Invalid friend request action';
  end if;

  update public.friendships
  set status = case when p_action = 'accept' then 'accepted' else 'declined' end,
      responded_at = now()
  where id = p_friendship_id
    and addressee_id = v_user_id
    and status = 'pending'
  returning * into v_result;

  if v_result.id is null then
    raise exception 'Friend request not found';
  end if;
  return v_result;
end;
$$;

-- Reassert the deleted owner policy instead of relying on the historical file.
drop policy if exists "user_state_delete_own" on public.user_state;
create policy "user_state_delete_own"
  on public.user_state
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Recreate each UPDATE policy from its security specification. This is more
-- reliable than inspecting pg_policy because it repairs drift deterministically.
drop policy if exists "user_state_update_own" on public.user_state;
create policy "user_state_update_own"
  on public.user_state
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists friendships_update_recipient on public.friendships;
create policy friendships_update_recipient
  on public.friendships
  for update
  to authenticated
  using (
    addressee_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    addressee_id = (select auth.uid())
    and requester_id <> addressee_id
    and status in ('accepted', 'declined')
  );

-- The analytics RPC is intentionally SECURITY DEFINER: its only caller is a
-- server route using the service-role key and the table remains private. Check
-- the current JWT claim as defence in depth, and keep its lookup path
-- independent from caller-controlled schemas.
create or replace function analytics.increment_daily_metric(
  p_event_name text,
  p_property_a text default '',
  p_property_b text default ''
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, analytics
as $$
begin
  if (select auth.jwt() ->> 'role') is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;

  insert into analytics.daily_metrics (metric_date, event_name, property_a, property_b, total)
  values (current_date, p_event_name, coalesce(p_property_a, ''), coalesce(p_property_b, ''), 1)
  on conflict (metric_date, event_name, property_a, property_b)
  do update set total = analytics.daily_metrics.total + 1, updated_at = now();
end;
$$;

revoke all on function analytics.increment_daily_metric(text, text, text) from public, anon, authenticated;
grant execute on function analytics.increment_daily_metric(text, text, text) to service_role;
revoke all on table analytics.daily_metrics from public, anon, authenticated;
grant select, insert, update, delete on table analytics.daily_metrics to service_role;
revoke all on table analytics.weekly_funnel from public, anon, authenticated;
grant select on table analytics.weekly_funnel to service_role;

-- A retained day is one of the 90 UTC calendar dates from current_date - 89
-- through current_date, inclusive. Dates current_date - 90 and older are
-- deleted. Supabase Cron is the sole retention strategy. The extension is enabled by a
-- controlled Dashboard action, then this migration creates a named, observable
-- daily job. Re-running this migration is not expected, but unscheduling first
-- makes the schedule deterministic if it is replayed in a disposable database.
do $cron$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception using
      errcode = '55000',
      message = 'pg_cron is required for analytics retention',
      hint = 'Enable Supabase Cron in Dashboard > Integrations > Cron before applying this migration.';
  end if;

  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'prune-lunidex-product-metrics';

  perform cron.schedule(
    'prune-lunidex-product-metrics',
    '15 3 * * *',
    $job$delete from analytics.daily_metrics where metric_date < current_date - 89$job$
  );
end;
$cron$;

comment on function analytics.increment_daily_metric(text, text, text) is
  'Server-only product metrics writer. Requires the service_role JWT claim.';
comment on table analytics.daily_metrics is
  'Private product metrics. Retains 90 UTC calendar dates including current_date; cron deletes current_date - 90 and older.';
