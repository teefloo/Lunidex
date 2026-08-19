-- Lunidex application schema for Neon PostgreSQL.
--
-- This is intentionally not a copy of Supabase's internal auth, storage,
-- realtime, graphql_public or vault schemas. Neon Auth owns authentication;
-- app.users stores the stable Neon Auth IDs needed by foreign keys. Password
-- hashes and refresh tokens are managed by Neon Auth and never enter this
-- application schema.
--
-- Authorization is kept at the authenticated server/API boundary in this
-- phase. The database connection string is server-only; do not expose Neon
-- directly to browsers or mobile clients. The former Supabase RLS policies that
-- depended on auth.uid(), auth.jwt(), anon and authenticated are therefore not
-- replayed here. API routes authenticate with Neon Auth and enforce ownership.

begin;

create extension if not exists pgcrypto;

create schema if not exists app;

create table if not exists app.users (
  id uuid primary key,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deletion_state text not null default 'active',
  deletion_requested_at timestamptz,
  deletion_completed_at timestamptz
);

-- Keep existing deployments compatible with the durable deletion state machine.
alter table app.users add column if not exists deletion_state text not null default 'active';
alter table app.users add column if not exists deletion_requested_at timestamptz;
alter table app.users add column if not exists deletion_completed_at timestamptz;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_deletion_state_check'
      and conrelid = 'app.users'::regclass
  ) then
    alter table app.users
      add constraint app_users_deletion_state_check
      check (deletion_state in ('active', 'pending', 'deleted'));
  end if;
end;
$$;
update app.users
set deletion_state = 'deleted',
    deletion_completed_at = coalesce(deletion_completed_at, deleted_at)
where deleted_at is not null and deletion_state = 'active';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_state (
  user_id uuid primary key references app.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.user_state is
  'Per-user Lunidex snapshot (favorites, caught, TCG collection, quiz, preferences).';

create table if not exists public.profiles (
  id uuid primary key references app.users (id) on delete cascade,
  name text,
  email text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  public_handle text,
  is_public boolean not null default false,
  avatar_pokemon_id integer,
  caught_count integer not null default 0,
  total_pokemon integer not null default 1025,
  unlocked_badges text[] not null default '{}',
  team_ids integer[] not null default '{}',
  quiz_best_score integer not null default 0,
  quiz_total_correct integer not null default 0,
  member_since timestamptz,
  quiz_best_streak integer not null default 0,
  tcg_owned_count integer not null default 0,
  caught_by_gen integer[] not null default '{0,0,0,0,0,0,0,0,0}',
  allow_friend_requests boolean not null default true,
  share_tcg_collection boolean not null default false,
  share_tcg_decks boolean not null default false,
  constraint profiles_public_handle_format check (
    public_handle is null
    or (length(public_handle) between 3 and 30
      and public_handle ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
  )
);

create table if not exists public.quiz_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  pseudo text not null,
  mode text not null,
  challenge text not null,
  score integer not null default 0,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, date, mode, challenge)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quiz_scores_score_range'
      and conrelid = 'public.quiz_scores'::regclass
  ) then
    alter table public.quiz_scores
      add constraint quiz_scores_score_range check (
        mode <> 'marathon'
        or challenge <> 'classic'
        or score between 0 and 10
      ) not valid;
  end if;
end;
$$;

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  mode text not null check (mode = 'marathon'),
  challenge text not null check (challenge = 'classic'),
  date date not null,
  question_ids integer[] not null check (cardinality(question_ids) = 10),
  answer_index integer not null default 0 check (answer_index between 0 and 10),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  wrong_answers integer not null default 0 check (wrong_answers >= 0),
  status text not null default 'active'
    check (status in ('active', 'completed', 'expired')),
  score integer not null default 0 check (score between 0 and 10),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint quiz_attempts_answer_count check (correct_answers + wrong_answers = answer_index)
);

comment on table public.quiz_attempts is
  'Server-owned daily quiz lifecycle. Answers are recorded before a leaderboard score is derived.';

comment on table public.quiz_scores is
  'Daily challenge leaderboard entries. Mutations are validated by the server API.';

create table if not exists public.battle_rooms (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid references app.users (id),
  player2_id uuid references app.users (id),
  player1_team jsonb,
  player2_team jsonb,
  state jsonb default '{}'::jsonb,
  status text default 'waiting'
    check (status in ('waiting', 'active', 'finished')),
  created_at timestamptz default now()
);

create table if not exists public.tcg_price_history (
  id bigserial primary key,
  card_id text not null,
  card_name text not null,
  set_id text not null,
  tcgplayer_low numeric(10,2),
  tcgplayer_mid numeric(10,2),
  tcgplayer_high numeric(10,2),
  cardmarket_avg numeric(10,2),
  cardmarket_low numeric(10,2),
  cardmarket_trend numeric(10,2),
  recorded_at timestamptz default now()
);

create table if not exists public.tcg_price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app.users (id) on delete cascade,
  card_id text not null,
  card_name text not null,
  alert_type text not null check (alert_type in ('below', 'above')),
  threshold_usd numeric(10,2),
  threshold_eur numeric(10,2),
  currency text default 'USD' check (currency in ('USD', 'EUR')),
  is_active boolean default true,
  last_triggered_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.user_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app.users (id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.friend_directory (
  user_id uuid primary key references app.users (id) on delete cascade,
  handle text,
  display_name text,
  allow_friend_requests boolean not null default true,
  share_tcg_collection boolean not null default false,
  share_tcg_decks boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references app.users (id) on delete cascade,
  addressee_id uuid not null references app.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_not_self check (requester_id <> addressee_id)
);

create table if not exists public.friend_collection_snapshots (
  user_id uuid primary key references app.users (id) on delete cascade,
  card_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_deck_snapshots (
  user_id uuid primary key references app.users (id) on delete cascade,
  decks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create schema if not exists analytics;

create table if not exists analytics.daily_metrics (
  metric_date date not null,
  event_name text not null check (event_name in (
    'tcg_start_opened', 'tcg_set_search_used', 'tcg_set_selected',
    'tcg_album_opened', 'tcg_first_value_reached', 'tcg_activation_completed',
    'tcg_sync_prompt_shown', 'tcg_sync_prompt_actioned',
    'tcg_returned_after_activation', 'tcg_activation_error'
  )),
  property_a text not null default '' check (char_length(property_a) <= 32),
  property_b text not null default '' check (char_length(property_b) <= 32),
  total bigint not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (metric_date, event_name, property_a, property_b)
);

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
  insert into analytics.daily_metrics (
    metric_date, event_name, property_a, property_b, total
  )
  values (
    current_date,
    p_event_name,
    coalesce(p_property_a, ''),
    coalesce(p_property_b, ''),
    1
  )
  on conflict (metric_date, event_name, property_a, property_b)
  do update set
    total = analytics.daily_metrics.total + 1,
    updated_at = now();
end;
$$;

revoke all on function analytics.increment_daily_metric(text, text, text) from public;

create or replace function public.caught_by_generation(p_caught jsonb)
returns integer[]
language sql
immutable
set search_path = pg_catalog, public
as $$
  select array[
    count(*) filter (where v between 1   and 151),
    count(*) filter (where v between 152 and 251),
    count(*) filter (where v between 252 and 386),
    count(*) filter (where v between 387 and 493),
    count(*) filter (where v between 494 and 649),
    count(*) filter (where v between 650 and 721),
    count(*) filter (where v between 722 and 809),
    count(*) filter (where v between 810 and 905),
    count(*) filter (where v between 906 and 1025)
  ]::integer[]
  from (
    select (elem #>> '{}')::int as v
    from jsonb_array_elements(coalesce(p_caught, '[]'::jsonb)) elem
  ) values_by_generation;
$$;

create or replace function public.sync_public_profile_from_user_state()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_data jsonb := new.data;
begin
  update public.profiles
  set
    caught_count = coalesce(jsonb_array_length(v_data -> 'caughtPokemon'), 0),
    caught_by_gen = public.caught_by_generation(v_data -> 'caughtPokemon'),
    unlocked_badges = coalesce(array(select jsonb_array_elements_text(v_data -> 'badges')), '{}'),
    team_ids = coalesce(array(select jsonb_array_elements_text(v_data -> 'team')::int), '{}'),
    quiz_best_score = greatest(
      coalesce((v_data -> 'quizHighScores' ->> 'classic')::int, 0),
      coalesce((v_data -> 'quizHighScores' ->> 'silhouette')::int, 0),
      coalesce((v_data -> 'quizHighScores' ->> 'stats')::int, 0),
      coalesce((v_data -> 'quizHighScores' ->> 'timeAttack')::int, 0)
    ),
    quiz_best_streak = coalesce((v_data ->> 'bestStreak')::int, 0),
    quiz_total_correct = coalesce((v_data ->> 'totalQuizCorrect')::int, 0),
    tcg_owned_count = coalesce(jsonb_array_length(v_data -> 'tcgOwnedCards'), 0),
    avatar_pokemon_id = (
      select (elem #>> '{}')::int
      from jsonb_array_elements(coalesce(v_data -> 'favorites', '[]'::jsonb)) elem
      limit 1
    ),
    member_since = coalesce(member_since, now())
  where id = new.user_id and is_public = true;
  return new;
end;
$$;

create or replace function public.enforce_friendship_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
    raise exception 'Friendship participants cannot change';
  end if;
  if old.status <> 'pending' or new.status not in ('accepted', 'declined') then
    raise exception 'Invalid friendship transition';
  end if;
  return new;
end;
$$;

create or replace function public.sync_friend_directory()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.friend_directory (
    user_id, handle, display_name, allow_friend_requests,
    share_tcg_collection, share_tcg_decks
  )
  values (
    new.id, nullif(trim(new.public_handle), ''),
    coalesce(nullif(trim(new.name), ''), 'Trainer'),
    new.allow_friend_requests, new.share_tcg_collection, new.share_tcg_decks
  )
  on conflict (user_id) do update set
    handle = excluded.handle,
    display_name = excluded.display_name,
    allow_friend_requests = excluded.allow_friend_requests,
    share_tcg_collection = excluded.share_tcg_collection,
    share_tcg_decks = excluded.share_tcg_decks;
  return new;
end;
$$;

create or replace function public.sync_friend_snapshots()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.friend_collection_snapshots where user_id = old.user_id;
    delete from public.friend_deck_snapshots where user_id = old.user_id;
    return old;
  end if;

  insert into public.friend_collection_snapshots (user_id, card_ids)
  values (
    new.user_id,
    coalesce(array(
      select distinct jsonb_array_elements_text(
        case when jsonb_typeof(new.data -> 'tcgOwnedCards') = 'array'
          then new.data -> 'tcgOwnedCards' else '[]'::jsonb end
      )
    ), '{}')
  )
  on conflict (user_id) do update set card_ids = excluded.card_ids;

  insert into public.friend_deck_snapshots (user_id, decks)
  values (
    new.user_id,
    case when jsonb_typeof(new.data -> 'tcgDecks') = 'array'
      then new.data -> 'tcgDecks' else '[]'::jsonb end
  )
  on conflict (user_id) do update set decks = excluded.decks;
  return new;
end;
$$;

drop trigger if exists user_state_set_updated_at on public.user_state;
create trigger user_state_set_updated_at
before update on public.user_state
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists friend_directory_set_updated_at on public.friend_directory;
create trigger friend_directory_set_updated_at
before update on public.friend_directory
for each row execute function public.set_updated_at();

drop trigger if exists friendships_set_updated_at on public.friendships;
create trigger friendships_set_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

drop trigger if exists friend_collection_snapshot_set_updated_at on public.friend_collection_snapshots;
create trigger friend_collection_snapshot_set_updated_at
before update on public.friend_collection_snapshots
for each row execute function public.set_updated_at();

drop trigger if exists friend_deck_snapshot_set_updated_at on public.friend_deck_snapshots;
create trigger friend_deck_snapshot_set_updated_at
before update on public.friend_deck_snapshots
for each row execute function public.set_updated_at();

drop trigger if exists sync_public_profile_insert on public.user_state;
drop trigger if exists sync_public_profile on public.user_state;
create trigger sync_public_profile_insert
after insert on public.user_state
for each row execute function public.sync_public_profile_from_user_state();
create trigger sync_public_profile
after update of data on public.user_state
for each row execute function public.sync_public_profile_from_user_state();

drop trigger if exists sync_friend_snapshots_on_user_state on public.user_state;
create trigger sync_friend_snapshots_on_user_state
after insert or update of data or delete on public.user_state
for each row execute function public.sync_friend_snapshots();

drop trigger if exists sync_friend_directory_on_profile on public.profiles;
create trigger sync_friend_directory_on_profile
after insert or update of name, public_handle, allow_friend_requests,
  share_tcg_collection, share_tcg_decks on public.profiles
for each row execute function public.sync_friend_directory();

drop trigger if exists enforce_friendship_transition_on_update on public.friendships;
create trigger enforce_friendship_transition_on_update
before update on public.friendships
for each row execute function public.enforce_friendship_transition();

create unique index if not exists profiles_public_handle_unique
  on public.profiles (lower(public_handle))
  where public_handle is not null;
create index if not exists profiles_handle_lookup
  on public.profiles (lower(public_handle))
  where public_handle is not null and is_public = true;
create index if not exists quiz_scores_date_score_idx
  on public.quiz_scores (date, score desc);
create index if not exists quiz_attempts_user_status_idx
  on public.quiz_attempts (user_id, status, started_at desc);
create index if not exists idx_battle_rooms_player1 on public.battle_rooms (player1_id);
create index if not exists idx_battle_rooms_player2 on public.battle_rooms (player2_id);
create index if not exists idx_battle_rooms_created_at on public.battle_rooms (created_at);
create index if not exists idx_price_history_card_id
  on public.tcg_price_history (card_id, recorded_at desc);
create index if not exists tcg_price_alerts_user_id_idx
  on public.tcg_price_alerts (user_id);
create unique index if not exists user_push_subscriptions_user_endpoint_unique
  on public.user_push_subscriptions (user_id, ((subscription ->> 'endpoint')));
create unique index if not exists friend_directory_handle_unique
  on public.friend_directory (lower(handle))
  where handle is not null;
create unique index if not exists friendships_pair_unique
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_requester_status
  on public.friendships (requester_id, status, updated_at desc);
create index if not exists friendships_addressee_status
  on public.friendships (addressee_id, status, updated_at desc);

create or replace view public.public_profiles
with (security_barrier = true)
as
select
  id, name, public_handle, is_public, avatar_pokemon_id, caught_count,
  total_pokemon, unlocked_badges, team_ids, quiz_best_score,
  quiz_best_streak, quiz_total_correct, tcg_owned_count, caught_by_gen,
  member_since
from public.profiles
where is_public = true;

create or replace view analytics.weekly_funnel as
select event_name, property_a, property_b, sum(total) as total
from analytics.daily_metrics
where metric_date >= current_date - 6
group by event_name, property_a, property_b;

comment on function public.set_updated_at() is
  'Shared timestamp trigger for the Neon application schema.';
comment on table analytics.daily_metrics is
  'Private product metrics. The application endpoint purges rows older than 90 days before metric writes.';

commit;
