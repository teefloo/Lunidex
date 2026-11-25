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
  not has_column_privilege('authenticated', 'public.quiz_scores', 'user_id', 'SELECT'),
  'authenticated cannot select internal leaderboard user IDs'
);

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

set local role authenticated;
select set_config('request.jwt.claim.sub', '1b160c34-2b7b-49c0-bfd0-b97ec8a68f31', true);
select is(
  (select count(*) from public.user_state),
  1::bigint,
  'an authenticated owner reads their own snapshot'
);
select is(
  (select count(*) from public.user_state where user_id = 'e3dc9ee8-46bd-4e1c-9be5-6802e8c0ad37'),
  0::bigint,
  'the first account cannot read the second account snapshot'
);
select is(
  (select count(*) from public.public_profiles where id = '1b160c34-2b7b-49c0-bfd0-b97ec8a68f31'),
  1::bigint,
  'an active public profile is visible through the allowlisted view'
);

select set_config('request.jwt.claim.sub', 'e3dc9ee8-46bd-4e1c-9be5-6802e8c0ad37', true);
select is(
  (select count(*) from public.user_state),
  1::bigint,
  'a second JWT reads only its own snapshot'
);
select is(
  (select count(*) from public.user_state where user_id = '1b160c34-2b7b-49c0-bfd0-b97ec8a68f31'),
  0::bigint,
  'the second account cannot read the first account snapshot'
);
select is(
  (select count(*) from public.public_profiles where id = '1b160c34-2b7b-49c0-bfd0-b97ec8a68f31'),
  1::bigint,
  'a second JWT can read an active public profile without its private email column'
);

reset role;
update app.users
set deletion_state = 'pending', deleted_at = now(), deletion_requested_at = now()
where id = '1b160c34-2b7b-49c0-bfd0-b97ec8a68f31';

set local role authenticated;
select set_config('request.jwt.claim.sub', '1b160c34-2b7b-49c0-bfd0-b97ec8a68f31', true);
select is(
  (select count(*) from public.user_state),
  0::bigint,
  'a pending account JWT cannot read rows while account data is being removed'
);
select is(
  (select count(*) from public.public_profiles where id = '1b160c34-2b7b-49c0-bfd0-b97ec8a68f31'),
  0::bigint,
  'a pending account JWT cannot read its previously public profile'
);

select * from finish();
rollback;
