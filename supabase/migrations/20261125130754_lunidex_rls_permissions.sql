-- RLS is the boundary for Supabase's exposed Data API. The Next.js server
-- continues to authenticate users and enforce ownership before using its
-- server-only PostgreSQL connection. Never expose that connection string.

begin;

-- Enable RLS for every Lunidex application table, including tables that are
-- intentionally unreachable through the Data API.
alter table app.users enable row level security;
alter table analytics.daily_metrics enable row level security;
alter table public.user_state enable row level security;
alter table public.profiles enable row level security;
alter table public.quiz_scores enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.battle_rooms enable row level security;
alter table public.tcg_price_history enable row level security;
alter table public.tcg_price_alerts enable row level security;
alter table public.user_push_subscriptions enable row level security;
alter table public.friend_directory enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_collection_snapshots enable row level security;
alter table public.friend_deck_snapshots enable row level security;
alter table public.tcg_sealed_products enable row level security;
alter table public.tcg_sealed_price_snapshots enable row level security;
alter table public.tcg_sealed_sync_runs enable row level security;
alter table public.tcg_sealed_settings enable row level security;
alter table public.tcg_sealed_transactions enable row level security;
alter table public.tcg_sealed_user_revisions enable row level security;
alter table public.tcg_sealed_allocations enable row level security;
alter table public.tcg_sealed_aliases enable row level security;
alter table public.tcg_sealed_audit enable row level security;
alter table public.tcg_sealed_portfolio_daily enable row level security;
alter table public.api_keys enable row level security;
alter table public.api_quota_buckets enable row level security;
alter table public.api_usage_daily enable row level security;
alter table public.api_idempotency enable row level security;
alter table public.tcg_price_history_qualified enable row level security;
alter table public.tcg_price_history_refresh_targets enable row level security;
alter table public.tcg_collection_shares enable row level security;

-- Revoke inherited/default API access first. Only the explicit reads below
-- are exposed; application mutations remain behind validated server routes.
revoke all on schema app, analytics from public, anon, authenticated;
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema analytics from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

-- The application schema is not in the PostgREST exposed-schema allowlist.
-- Its narrow read grant lets public-table policies reject stale tokens after
-- an account enters the pending/deleted state. Only active UUIDs are visible.
grant usage on schema app to anon, authenticated;
grant select (id, deletion_state) on app.users to anon, authenticated;
create policy active_application_identity_read on app.users
  for select to anon, authenticated
  using (deletion_state = 'active');

alter default privileges in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

-- Profiles are only exposed through the allowlisted public projection. The
-- email column is deliberately excluded from both the grants and the view.
alter view public.public_profiles set (security_invoker = true);
grant select (
  id, name, public_handle, is_public, avatar_pokemon_id, caught_count,
  total_pokemon, unlocked_badges, team_ids, quiz_best_score,
  quiz_best_streak, quiz_total_correct, tcg_owned_count, caught_by_gen,
  member_since
) on public.profiles to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
create policy profiles_public_or_owner_read on public.profiles
  for select to anon, authenticated
  using (
    exists (
      select 1 from app.users active_account
      where active_account.id = profiles.id and active_account.deletion_state = 'active'
    )
    and (is_public or (select auth.uid()) = id)
  );

-- Public leaderboard rows are intentionally public. All writes still go
-- through validated server-side quiz endpoints. The user UUID remains only
-- inside the RLS predicate and server-side leaderboard route.
grant select (pseudo, mode, challenge, score, date)
  on public.quiz_scores to anon, authenticated;
create policy quiz_scores_public_read on public.quiz_scores
  for select to anon, authenticated
  using (
    exists (
      select 1 from app.users active_account
      where active_account.id = quiz_scores.user_id and active_account.deletion_state = 'active'
    )
  );

-- Direct authenticated reads of user-owned state are owner-scoped. Mutations
-- are withheld from client roles so quiz, sync, and portfolio validation stays
-- in the existing API layer.
grant select on public.user_state to authenticated;
create policy user_state_owner_read on public.user_state
  for select to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from app.users active_account
    where active_account.id = user_state.user_id and active_account.deletion_state = 'active'
  ));

grant select on public.quiz_attempts to authenticated;
create policy quiz_attempts_owner_read on public.quiz_attempts
  for select to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from app.users active_account
    where active_account.id = quiz_attempts.user_id and active_account.deletion_state = 'active'
  ));

grant select on public.battle_rooms to authenticated;
create policy battle_rooms_participant_read on public.battle_rooms
  for select to authenticated
  using (
    exists (select 1 from app.users active_caller where active_caller.id = (select auth.uid()))
    and (select auth.uid()) in (player1_id, player2_id)
    and (
      player1_id is null or exists (select 1 from app.users a where a.id = player1_id)
    )
    and (
      player2_id is null or exists (select 1 from app.users a where a.id = player2_id)
    )
  );

grant select on public.tcg_price_alerts to authenticated;
create policy tcg_price_alerts_owner_read on public.tcg_price_alerts
  for select to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from app.users active_account
    where active_account.id = tcg_price_alerts.user_id and active_account.deletion_state = 'active'
  ));

grant select (user_id, handle, display_name, allow_friend_requests)
  on public.friend_directory to authenticated;
create policy friend_directory_discoverable_read on public.friend_directory
  for select to authenticated
  using (
    exists (select 1 from app.users active_caller where active_caller.id = (select auth.uid()))
    and exists (select 1 from app.users active_owner where active_owner.id = friend_directory.user_id)
    and ((select auth.uid()) = user_id or allow_friend_requests)
  );

grant select (
  id, requester_id, addressee_id, status, created_at, updated_at, responded_at
) on public.friendships to authenticated;
create policy friendships_participant_read on public.friendships
  for select to authenticated
  using (
    exists (select 1 from app.users active_caller where active_caller.id = (select auth.uid()))
    and (select auth.uid()) in (requester_id, addressee_id)
    and exists (select 1 from app.users a where a.id = friendships.requester_id)
    and exists (select 1 from app.users a where a.id = friendships.addressee_id)
  );

grant select on public.friend_collection_snapshots to authenticated;
create policy friend_collection_snapshots_owner_read on public.friend_collection_snapshots
  for select to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from app.users active_account
    where active_account.id = friend_collection_snapshots.user_id
  ));

grant select on public.friend_deck_snapshots to authenticated;
create policy friend_deck_snapshots_owner_read on public.friend_deck_snapshots
  for select to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from app.users active_account
    where active_account.id = friend_deck_snapshots.user_id
  ));

grant select on public.tcg_sealed_transactions to authenticated;
create policy tcg_sealed_transactions_owner_read on public.tcg_sealed_transactions
  for select to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from app.users active_account
    where active_account.id = tcg_sealed_transactions.user_id
  ));

grant select on public.tcg_sealed_user_revisions to authenticated;
create policy tcg_sealed_user_revisions_owner_read on public.tcg_sealed_user_revisions
  for select to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from app.users active_account
    where active_account.id = tcg_sealed_user_revisions.user_id
  ));

grant select on public.tcg_sealed_allocations to authenticated;
create policy tcg_sealed_allocations_owner_read on public.tcg_sealed_allocations
  for select to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from app.users active_account
    where active_account.id = tcg_sealed_allocations.user_id
  ));

grant select on public.tcg_sealed_aliases to authenticated;
create policy tcg_sealed_aliases_owner_read on public.tcg_sealed_aliases
  for select to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from app.users active_account
    where active_account.id = tcg_sealed_aliases.user_id
  ));

grant select on public.tcg_sealed_audit to authenticated;
create policy tcg_sealed_audit_owner_read on public.tcg_sealed_audit
  for select to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from app.users active_account
    where active_account.id = tcg_sealed_audit.user_id
  ));

grant select on public.tcg_sealed_portfolio_daily to authenticated;
create policy tcg_sealed_portfolio_daily_owner_read on public.tcg_sealed_portfolio_daily
  for select to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from app.users active_account
    where active_account.id = tcg_sealed_portfolio_daily.user_id
  ));

-- API key material, push endpoints, share token hashes, price refresh control,
-- global catalogue writes, analytics, and quota/idempotency state remain
-- inaccessible to anon/authenticated. RLS with no client policy is deny-all.

commit;
