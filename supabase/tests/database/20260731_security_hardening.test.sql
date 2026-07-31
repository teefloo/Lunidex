begin;

select plan(22);

-- The test runner is privileged. These deterministic IDs avoid fixtures with
-- personal data; replication_role is limited to this rolled-back transaction
-- so the FK setup cannot affect the database outside this test.
set local session_replication_role = replica;
insert into public.user_state (user_id, data) values
  ('00000000-0000-0000-0000-000000000101', '{"owner": "one"}'::jsonb),
  ('00000000-0000-0000-0000-000000000202', '{"owner": "two"}'::jsonb);
insert into public.friendships (id, requester_id, addressee_id, status) values
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000202', 'pending');
set local session_replication_role = origin;

select policies_are(
  'public', 'user_state',
  array['user_state_delete_own', 'user_state_insert_own', 'user_state_select_own', 'user_state_update_own'],
  'user_state has exactly the four owner policies'
);
select policy_roles_are('public', 'user_state', 'user_state_update_own', array['authenticated'::name], 'user_state update is authenticated-only');
select policy_roles_are('public', 'profiles', 'profiles_update_own', array['authenticated'::name], 'profiles update is authenticated-only');
select policy_roles_are('public', 'friendships', 'friendships_update_recipient', array['authenticated'::name], 'friendship update is authenticated-only');
select policy_cmd_is('public', 'user_state', 'user_state_update_own', 'UPDATE', 'user_state policy applies to UPDATE');
select policy_cmd_is('public', 'profiles', 'profiles_update_own', 'UPDATE', 'profiles policy applies to UPDATE');
select policy_cmd_is('public', 'friendships', 'friendships_update_recipient', 'UPDATE', 'friendship policy applies to UPDATE');

-- This examines every direct EXECUTE ACL for every SECURITY DEFINER function.
-- `acldefault` makes a missing ACL visible as PostgreSQL's implicit PUBLIC grant.
select results_eq(
  $$
    select coalesce(string_agg(p.oid::regprocedure::text || ':' || coalesce(r.rolname, 'PUBLIC'), ',' order by p.oid::regprocedure::text, coalesce(r.rolname, 'PUBLIC')), '')
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    left join pg_roles r on r.oid = acl.grantee
    where p.prosecdef
      and n.nspname in ('public', 'analytics')
      and acl.privilege_type = 'EXECUTE'
      and (acl.grantee = 0 or r.rolname in ('anon', 'authenticated', 'service_role'))
  $$,
  $$
    values (
      'analytics.increment_daily_metric(text,text,text):service_role,' ||
      'public.respond_to_friend_request(uuid,text):authenticated,' ||
      'public.send_friend_request(text):authenticated,' ||
      'public.set_public_profile(text,boolean):authenticated,' ||
      'public.submit_quiz_score(text,text,integer,text):authenticated'
    )
  $$,
  'all SECURITY DEFINER function EXECUTE ACLs are explicit and minimal'
);

set local role anon;
select throws_ok(
  $$select analytics.increment_daily_metric('tcg_start_opened', 'anonymous', '')$$,
  '42501', null,
  'anon cannot write product metrics'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000101';
select throws_ok(
  $$select analytics.increment_daily_metric('tcg_start_opened', 'authenticated', '')$$,
  '42501', null,
  'authenticated cannot write product metrics'
);
reset role;

set local role service_role;
set local request.jwt.claims = '{"role":"authenticated"}';
select throws_ok(
  $$select analytics.increment_daily_metric('tcg_start_opened', 'wrong-claim', '')$$,
  'P0001', 'Service role required',
  'the metrics RPC rejects a non-service JWT claim even for its database role'
);
set local request.jwt.claims = '{"role":"service_role"}';
select lives_ok(
  $$select analytics.increment_daily_metric('tcg_start_opened', 'service-role', '')$$,
  'service_role can write product metrics with its current JWT claim'
);
reset role;

-- 90 retained calendar dates includes today through today - 89. The row at
-- today - 90 is the deletion boundary, while today - 89 remains visible.
insert into analytics.daily_metrics (metric_date, event_name, property_a, property_b, total) values
  (current_date - 90, 'tcg_start_opened', 'retention-delete', '', 1),
  (current_date - 89, 'tcg_start_opened', 'retention-keep', '', 1);
delete from analytics.daily_metrics where metric_date < current_date - 89;
select results_eq(
  $$select count(*)::bigint from analytics.daily_metrics where property_a = 'retention-delete'$$,
  $$values (0::bigint)$$,
  'a metric dated current_date - 90 is deleted'
);
select results_eq(
  $$select count(*)::bigint from analytics.daily_metrics where property_a = 'retention-keep'$$,
  $$values (1::bigint)$$,
  'a metric dated current_date - 89 is retained'
);

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000101';
select results_eq(
  $$update public.user_state set data = '{"owner": "one-updated"}'::jsonb where user_id = '00000000-0000-0000-0000-000000000101' returning 1$$,
  $$values (1)$$,
  'an owner can update their own state'
);
select results_eq(
  $$update public.user_state set data = '{"owner": "hijacked"}'::jsonb where user_id = '00000000-0000-0000-0000-000000000202' returning 1$$,
  $$select 1 where false$$,
  'an owner cannot update another user state'
);
select results_eq(
  $$delete from public.user_state where user_id = '00000000-0000-0000-0000-000000000202' returning 1$$,
  $$select 1 where false$$,
  'an owner cannot delete another user state'
);
select results_eq(
  $$delete from public.user_state where user_id = '00000000-0000-0000-0000-000000000101' returning 1$$,
  $$values (1)$$,
  'an owner can delete their own state'
);
select throws_ok(
  $$select public.respond_to_friend_request('00000000-0000-0000-0000-000000000303', 'accept')$$,
  'P0001', 'Friend request not found',
  'the requester cannot accept their own pending friendship'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000202';
select lives_ok(
  $$select public.respond_to_friend_request('00000000-0000-0000-0000-000000000303', 'accept')$$,
  'only the pending request recipient can accept the friendship'
);
reset role;

select results_eq(
  $$select status from public.friendships where id = '00000000-0000-0000-0000-000000000303'$$,
  $$values ('accepted'::text)$$,
  'the recipient transition persists accepted status'
);

select results_eq(
  $$select count(*)::bigint from cron.job where jobname = 'prune-lunidex-product-metrics'$$,
  $$values (1::bigint)$$,
  'exactly one observable metrics-retention job exists'
);

select * from finish();
rollback;
