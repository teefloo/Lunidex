begin;

select plan(16);

insert into app.users (id)
values
  ('1b160c34-2b7b-49c0-bfd0-b97ec8a68f31'),
  ('e3dc9ee8-46bd-4e1c-9be5-6802e8c0ad37');

insert into public.user_state (user_id, data)
values
  ('1b160c34-2b7b-49c0-bfd0-b97ec8a68f31', '{"owner":"first"}'::jsonb),
  ('e3dc9ee8-46bd-4e1c-9be5-6802e8c0ad37', '{"owner":"second"}'::jsonb);

insert into public.profiles (id, name, email, is_public)
values
  ('1b160c34-2b7b-49c0-bfd0-b97ec8a68f31', 'First trainer', 'first@example.test', true),
  ('e3dc9ee8-46bd-4e1c-9be5-6802e8c0ad37', 'Second trainer', 'second@example.test', true);

insert into public.quiz_scores (user_id, pseudo, mode, challenge, score, date)
values ('1b160c34-2b7b-49c0-bfd0-b97ec8a68f31', 'First trainer', 'marathon', 'classic', 4, current_date);

select ok(
  not has_table_privilege('anon', 'public.api_keys', 'SELECT'),
  'anon cannot select API keys'
);
select ok(
  not has_table_privilege('anon', 'analytics.daily_metrics', 'SELECT'),
  'anon cannot select analytics metrics'
);
select ok(
  not has_column_privilege('anon', 'public.profiles', 'email', 'SELECT'),
  'anon cannot select profile emails'
);
select ok(
  has_column_privilege('anon', 'public.quiz_scores', 'pseudo', 'SELECT'),
  'anon can read the public leaderboard projection'
);
select ok(
  not has_column_privilege('anon', 'public.quiz_scores', 'user_id', 'SELECT'),
  'anon cannot select internal leaderboard user IDs'
);
select ok(
  not has_schema_privilege('authenticated', 'public', 'USAGE'),
  'authenticated has no direct PostgREST access to the public schema'
);
select ok(
  not has_schema_privilege('authenticated', 'app', 'USAGE'),
  'authenticated cannot query the internal application schema'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_state', 'SELECT'),
  'authenticated cannot read application rows through the Data API'
);
select ok(
  not exists (
    select 1
    from pg_proc procedure
    join pg_namespace schema on schema.oid = procedure.pronamespace
    where schema.nspname in ('public', 'app', 'analytics')
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ),
  'authenticated cannot execute exposed application functions'
);

create table public.lunidex_auth_api_default_privileges_probe (id integer);
select ok(
  not has_table_privilege('authenticated', 'public.lunidex_auth_api_default_privileges_probe', 'SELECT'),
  'new public tables remain closed to authenticated by default'
);
drop table public.lunidex_auth_api_default_privileges_probe;

set local role anon;
select is(
  (select count(*) from public.public_profiles where id = '1b160c34-2b7b-49c0-bfd0-b97ec8a68f31'),
  1::bigint,
  'anon can read an active public profile through the allowlisted view'
);
select is(
  (select count(score) from public.quiz_scores where mode = 'marathon' and challenge = 'classic'),
  1::bigint,
  'anon can read public leaderboard scores without selecting user IDs'
);
reset role;

select is(
  (select count(*) from public.user_state where user_id in (
    '1b160c34-2b7b-49c0-bfd0-b97ec8a68f31',
    'e3dc9ee8-46bd-4e1c-9be5-6802e8c0ad37'
  )),
  2::bigint,
  'both existing accounts retain their user-state rows after authenticated API access is closed'
);
select is(
  (select count(*) from public.profiles where id in (
    '1b160c34-2b7b-49c0-bfd0-b97ec8a68f31',
    'e3dc9ee8-46bd-4e1c-9be5-6802e8c0ad37'
  )),
  2::bigint,
  'both existing profiles remain unchanged and present'
);
select is(
  (select count(*) from app.users where id in (
    '1b160c34-2b7b-49c0-bfd0-b97ec8a68f31',
    'e3dc9ee8-46bd-4e1c-9be5-6802e8c0ad37'
  )),
  2::bigint,
  'both account identity rows remain present'
);
select ok(
  has_table_privilege(current_user, 'public.user_state', 'SELECT'),
  'the server database role retains the access needed by guarded API handlers'
);

select * from finish();
rollback;
