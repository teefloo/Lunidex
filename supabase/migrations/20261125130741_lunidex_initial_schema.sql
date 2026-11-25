-- Lunidex application schema for Supabase PostgreSQL.
-- Ported in order from the current Neon schema migrations. This migration
-- creates application objects only; it never imports or replaces auth,
-- storage, realtime, or other Supabase-managed schemas.

-- Source schema migration: 0001_lunidex_app.sql
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

/**
 * Serialize lifecycle claims with every application write that is associated
 * with an account. The trigger arguments name one or more UUID columns. IDs
 * are locked in sorted order so a friendship or battle update cannot deadlock
 * with another multi-account mutation. A pending/deleted account is rejected
 * at the database boundary even if an API-level preflight ran earlier.
 */
create or replace function public.require_active_account()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, app
as $$
declare
  account_column text;
  account_id uuid;
  account_ids uuid[] := '{}';
  account_state text;
begin
  foreach account_column in array tg_argv loop
    account_id := nullif(to_jsonb(new) ->> account_column, '')::uuid;
    if account_id is not null then
      account_ids := array_append(account_ids, account_id);
    end if;
  end loop;

  for account_id in
    select distinct candidate.id
    from unnest(account_ids) as candidate(id)
    order by candidate.id
  loop
    select deletion_state
      into account_state
      from app.users
     where id = account_id
     for update;

    if account_state is distinct from 'active' then
      raise exception 'Account is not active' using errcode = 'P0001';
    end if;
  end loop;

  return new;
end;
$$;

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

create or replace function public.distinct_tcg_owned_count(p_cards jsonb)
returns integer
language sql
immutable
set search_path = pg_catalog, public
as $$
  select count(*)::integer
  from (
    select distinct lower(btrim(value)) as card_id
    from jsonb_array_elements_text(
      case when jsonb_typeof(p_cards) = 'array'
        then p_cards else '[]'::jsonb end
    ) values_by_card(value)
    where length(btrim(value)) between 3 and 128
      and btrim(value) ~ '^[a-zA-Z0-9][a-zA-Z0-9._:/-]*-[a-zA-Z0-9][a-zA-Z0-9._:/-]*$'
  ) distinct_cards;
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
    tcg_owned_count = public.distinct_tcg_owned_count(v_data -> 'tcgOwnedCards'),
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

drop trigger if exists require_active_account_user_state on public.user_state;
create trigger require_active_account_user_state
before insert or update on public.user_state
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_profiles on public.profiles;
create trigger require_active_account_profiles
before insert or update on public.profiles
for each row execute function public.require_active_account('id');

drop trigger if exists require_active_account_quiz_scores on public.quiz_scores;
create trigger require_active_account_quiz_scores
before insert or update on public.quiz_scores
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_quiz_attempts on public.quiz_attempts;
create trigger require_active_account_quiz_attempts
before insert or update on public.quiz_attempts
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_battle_rooms on public.battle_rooms;
create trigger require_active_account_battle_rooms
before insert or update on public.battle_rooms
for each row execute function public.require_active_account('player1_id', 'player2_id');

drop trigger if exists require_active_account_tcg_price_alerts on public.tcg_price_alerts;
create trigger require_active_account_tcg_price_alerts
before insert or update on public.tcg_price_alerts
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_user_push_subscriptions on public.user_push_subscriptions;
create trigger require_active_account_user_push_subscriptions
before insert or update on public.user_push_subscriptions
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_friend_directory on public.friend_directory;
create trigger require_active_account_friend_directory
before insert or update on public.friend_directory
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_friendships on public.friendships;
create trigger require_active_account_friendships
before insert or update on public.friendships
for each row execute function public.require_active_account('requester_id', 'addressee_id');

drop trigger if exists require_active_account_friend_collection_snapshots on public.friend_collection_snapshots;
create trigger require_active_account_friend_collection_snapshots
before insert or update on public.friend_collection_snapshots
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_friend_deck_snapshots on public.friend_deck_snapshots;
create trigger require_active_account_friend_deck_snapshots
before insert or update on public.friend_deck_snapshots
for each row execute function public.require_active_account('user_id');

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

update public.profiles profiles
set tcg_owned_count = public.distinct_tcg_owned_count(user_state.data -> 'tcgOwnedCards')
from public.user_state
join app.users on app.users.id = user_state.user_id
where profiles.id = user_state.user_id
  and app.users.deletion_state = 'active';

create index if not exists quiz_scores_date_score_idx
  on public.quiz_scores (date, score desc);

-- Existing deployments may contain replay-created duplicates. Keep the most
-- useful record (completed/highest score first, then progress and age) before
-- enforcing the one-attempt-per-user/date invariant.
with ranked_attempts as (
  select id,
    row_number() over (
      partition by user_id, date, mode, challenge
      order by (status = 'completed') desc,
        score desc,
        answer_index desc,
        started_at asc,
        id asc
    ) as row_number
  from public.quiz_attempts
)
delete from public.quiz_attempts attempts
using ranked_attempts duplicates
where attempts.id = duplicates.id
  and duplicates.row_number > 1;

create unique index if not exists quiz_attempts_user_daily_unique
  on public.quiz_attempts (user_id, date, mode, challenge);
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
  'Shared timestamp trigger for the Lunidex application schema.';
comment on table analytics.daily_metrics is
  'Private product metrics. The application endpoint purges rows older than 90 days before metric writes.';

commit;

-- Source schema migration: 0002_battle_rooms_cascade.sql
-- 0002: referential-integrity and constraint hardening follow-ups from the
-- 2026-08 audit. Idempotent and additive; no existing rows are modified.

begin;

-- battle_rooms.player1_id/player2_id were the only user-referencing foreign
-- keys without an ON DELETE action. Application code compensates manually
-- today, but any direct operational cleanup of app.users would fail on these
-- rows. Re-create each constraint with ON DELETE CASCADE only when it does not
-- already cascade, so re-running this migration is a no-op.
do $$
declare
  needs_cascade boolean;
begin
  -- `to_regclass` is deliberately evaluated before any regclass cast. This
  -- keeps the follow-up migration a no-op on a database that has not received
  -- the base schema yet.
  if to_regclass('public.battle_rooms') is not null
     and to_regclass('app.users') is not null then
    select exists (
      select 1 from pg_constraint
      where conname = 'battle_rooms_player1_id_fkey'
        and conrelid = 'public.battle_rooms'::regclass
        and confdeltype <> 'c'
    ) into needs_cascade;
    if needs_cascade then
      alter table public.battle_rooms drop constraint battle_rooms_player1_id_fkey;
      alter table public.battle_rooms
        add constraint battle_rooms_player1_id_fkey
        foreign key (player1_id) references app.users (id) on delete cascade;
    end if;

    select exists (
      select 1 from pg_constraint
      where conname = 'battle_rooms_player2_id_fkey'
        and conrelid = 'public.battle_rooms'::regclass
        and confdeltype <> 'c'
    ) into needs_cascade;
    if needs_cascade then
      alter table public.battle_rooms drop constraint battle_rooms_player2_id_fkey;
      alter table public.battle_rooms
        add constraint battle_rooms_player2_id_fkey
        foreign key (player2_id) references app.users (id) on delete cascade;
    end if;

    -- Fresh deployments that skipped 0001's battle_rooms definition entirely.
    if not exists (
      select 1 from pg_constraint
      where conname = 'battle_rooms_player1_id_fkey'
        and conrelid = 'public.battle_rooms'::regclass
    ) then
      alter table public.battle_rooms
        add constraint battle_rooms_player1_id_fkey
        foreign key (player1_id) references app.users (id) on delete cascade;
    end if;
    if not exists (
      select 1 from pg_constraint
      where conname = 'battle_rooms_player2_id_fkey'
        and conrelid = 'public.battle_rooms'::regclass
    ) then
      alter table public.battle_rooms
        add constraint battle_rooms_player2_id_fkey
        foreign key (player2_id) references app.users (id) on delete cascade;
    end if;
  end if;
end;
$$;

-- quiz_scores.mode/challenge were unconstrained TEXT. Constrain them to the
-- exact value sets shared by src/lib/leaderboard.ts (LEADERBOARD_MODES /
-- LEADERBOARD_CHALLENGES) so new variants require a deliberate migration.
do $$
begin
  if to_regclass('public.quiz_scores') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'quiz_scores_mode_allowed'
        and conrelid = 'public.quiz_scores'::regclass
    ) then
      alter table public.quiz_scores
        add constraint quiz_scores_mode_allowed
        check (mode in ('time-attack', 'survival', 'marathon'));
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'quiz_scores_challenge_allowed'
        and conrelid = 'public.quiz_scores'::regclass
    ) then
      alter table public.quiz_scores
        add constraint quiz_scores_challenge_allowed
        check (challenge in ('classic', 'silhouette', 'stats'));
    end if;
  end if;
end;
$$;

-- Retention jobs filter these columns directly. Keep cleanup bounded when the
-- append-only tables grow beyond the small migrated dataset.
do $$
begin
  if to_regclass('public.quiz_attempts') is not null then
    create index if not exists quiz_attempts_status_started_at_idx
      on public.quiz_attempts (status, started_at);
  end if;
  if to_regclass('public.tcg_price_history') is not null then
    create index if not exists tcg_price_history_recorded_at_idx
      on public.tcg_price_history (recorded_at);
  end if;
end;
$$;

commit;

-- Source schema migration: 0003_tcg_collection_languages.sql
begin;

/*
 * Language-aware collection projection. `card_ids` remains the compact v1
 * compatibility index used by existing friend clients; `collection_state`
 * carries the new per-collection ownership tokens without assigning a
 * language to historical cards.
 */
alter table public.friend_collection_snapshots
  add column if not exists collection_state jsonb not null default '{}'::jsonb;

/* Count the compact projection stored in friend snapshots. The projection
 * intentionally has no complete user-state envelope, so keep this helper
 * separate from physical_tcg_owned_count(jsonb). */
create or replace function public.physical_tcg_collection_state_count(p_state jsonb)
returns integer
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  legacy_count integer := 0;
  collection_count integer := 0;
begin
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    return 0;
  end if;

  if jsonb_typeof(p_state -> 'legacyOwnedCards') = 'array' then
    legacy_count := jsonb_array_length(p_state -> 'legacyOwnedCards');
  end if;

  if jsonb_typeof(p_state -> 'collectionCards') = 'array' then
    /* v2 entries count as one; v3 entries end in |variant|quantity. */
    select coalesce(sum(
      case
        when value ~ '\|([1-9][0-9]{0,3}|10000)$'
          then substring(value from '\|([0-9]+)$')::integer
        else 1
      end
    ), 0)
    into collection_count
    from jsonb_array_elements_text(p_state -> 'collectionCards') as cards(value);
  end if;

  return legacy_count + collection_count;
end;
$$;

create or replace function public.physical_tcg_owned_count(p_data jsonb)
returns integer
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  has_new_model boolean;
  legacy_count integer := 0;
  collection_count integer := 0;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    return 0;
  end if;

  /* Empty v2 arrays can be appended by a v1 importer. Only treat those as
   * the new model when an explicit version/legacy field or a non-empty
   * collection projection proves that the state is language-aware. */
  has_new_model := coalesce(p_data ->> 'tcgCollectionModelVersion', '') <> '1'
    and ((p_data ->> 'tcgCollectionModelVersion') = '2'
      or (p_data ->> 'tcgCollectionModelVersion') = '3'
      or (jsonb_typeof(p_data -> 'tcgLegacyOwnedCards') = 'array'
        and jsonb_array_length(p_data -> 'tcgLegacyOwnedCards') > 0)
      or jsonb_array_length(case when jsonb_typeof(p_data -> 'tcgCollectionCards') = 'array'
        then p_data -> 'tcgCollectionCards' else '[]'::jsonb end) > 0
      or jsonb_array_length(case when jsonb_typeof(p_data -> 'tcgCollections') = 'array'
        then p_data -> 'tcgCollections' else '[]'::jsonb end) > 0
      or jsonb_array_length(case when jsonb_typeof(p_data -> 'tcgActiveCollections') = 'array'
        then p_data -> 'tcgActiveCollections' else '[]'::jsonb end) > 0);

  if has_new_model then
    if jsonb_typeof(p_data -> 'tcgLegacyOwnedCards') = 'array' then
      legacy_count := jsonb_array_length(p_data -> 'tcgLegacyOwnedCards');
    end if;
    if jsonb_typeof(p_data -> 'tcgCollectionCards') = 'array' then
      /* v2 tokens represent one card per entry; v3 may carry a physical
       * quantity suffix (`|variant|quantity`). Invalid/legacy tokens still
       * count as one here; the API boundary performs strict validation. */
      select coalesce(sum(
        case
          when value ~ '\|([1-9][0-9]{0,3}|10000)$'
            then substring(value from '\|([0-9]+)$')::integer
          else 1
        end
      ), 0)
      into collection_count
      from jsonb_array_elements_text(p_data -> 'tcgCollectionCards') as cards(value);
    end if;
    return legacy_count + collection_count;
  end if;

  /* v1 has one deduplicated compatibility list, so retain its semantics. */
  return public.distinct_tcg_owned_count(p_data -> 'tcgOwnedCards');
end;
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
    tcg_owned_count = public.physical_tcg_owned_count(v_data),
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

create or replace function public.sync_friend_snapshots()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_data jsonb;
  v_collection_state jsonb;
begin
  if tg_op = 'DELETE' then
    delete from public.friend_collection_snapshots where user_id = old.user_id;
    delete from public.friend_deck_snapshots where user_id = old.user_id;
    return old;
  end if;

  v_data := new.data;
  v_collection_state := jsonb_build_object(
    'modelVersion', case
      when (v_data ->> 'tcgCollectionModelVersion') ~ '^[0-9]+$'
        then (v_data ->> 'tcgCollectionModelVersion')::integer
      else 3
    end,
    'browseLanguage', case when jsonb_typeof(v_data -> 'tcgBrowseLanguage') = 'string' then v_data -> 'tcgBrowseLanguage' else null end,
    'collections', case when jsonb_typeof(v_data -> 'tcgCollections') = 'array' then v_data -> 'tcgCollections' else '[]'::jsonb end,
    'collectionCards', case when jsonb_typeof(v_data -> 'tcgCollectionCards') = 'array' then v_data -> 'tcgCollectionCards' else '[]'::jsonb end,
    'activeCollections', case when jsonb_typeof(v_data -> 'tcgActiveCollections') = 'array' then v_data -> 'tcgActiveCollections' else '[]'::jsonb end,
    'legacyOwnedCards', case
      /* Once a language-aware model is explicit, tcgOwnedCards is only the
       * deduplicated compatibility index and must never be copied back into
       * the legacy projection. */
      when (v_data ->> 'tcgCollectionModelVersion') in ('2', '3')
        and jsonb_typeof(v_data -> 'tcgLegacyOwnedCards') = 'array' then v_data -> 'tcgLegacyOwnedCards'
      when jsonb_typeof(v_data -> 'tcgLegacyOwnedCards') = 'array'
        and coalesce(v_data ->> 'tcgCollectionModelVersion', '') <> '1'
        and jsonb_array_length(v_data -> 'tcgLegacyOwnedCards') > 0 then v_data -> 'tcgLegacyOwnedCards'
      when jsonb_typeof(v_data -> 'tcgOwnedCards') = 'array' then v_data -> 'tcgOwnedCards'
      else '[]'::jsonb
    end
  );

  insert into public.friend_collection_snapshots (user_id, card_ids, collection_state)
  values (
    new.user_id,
    coalesce(array(
      /* Keep the v1 card_ids projection useful even when a v2 importer did
       * not include the derived compatibility index. */
      select distinct card_id
      from (
        select value as card_id
        from jsonb_array_elements_text(case
          when jsonb_typeof(v_data -> 'tcgOwnedCards') = 'array'
            then v_data -> 'tcgOwnedCards' else '[]'::jsonb end
        ) as owned(value)
        union all
        select split_part(value, '|', 2) as card_id
        from jsonb_array_elements_text(case
          when jsonb_typeof(v_data -> 'tcgCollectionCards') = 'array'
            then v_data -> 'tcgCollectionCards' else '[]'::jsonb end
        ) as collection_cards(value)
        union all
        select value as card_id
        from jsonb_array_elements_text(case
          when jsonb_typeof(v_data -> 'tcgLegacyOwnedCards') = 'array'
            then v_data -> 'tcgLegacyOwnedCards' else '[]'::jsonb end
        ) as legacy(value)
      ) projected
      where card_id <> ''
    ), '{}'),
    v_collection_state
  )
  on conflict (user_id) do update set
    card_ids = excluded.card_ids,
    collection_state = excluded.collection_state;

  insert into public.friend_deck_snapshots (user_id, decks)
  values (
    new.user_id,
    case when jsonb_typeof(v_data -> 'tcgDecks') = 'array'
      then v_data -> 'tcgDecks' else '[]'::jsonb end
  )
  on conflict (user_id) do update set decks = excluded.decks;
  return new;
end;
$$;

/* Existing snapshots are explicitly historical: no language is invented. */
update public.friend_collection_snapshots
set collection_state = jsonb_build_object(
  'modelVersion', 3,
  'browseLanguage', null,
  'collections', '[]'::jsonb,
  'collectionCards', '[]'::jsonb,
  'activeCollections', '[]'::jsonb,
  'legacyOwnedCards', to_jsonb(card_ids)
)
where collection_state is null or collection_state = '{}'::jsonb;

update public.profiles profiles
set tcg_owned_count = public.physical_tcg_owned_count(user_state.data)
from public.user_state
join app.users on app.users.id = user_state.user_id
where profiles.id = user_state.user_id
  and app.users.deletion_state = 'active';

commit;

-- Source schema migration: 0004_tcg_collection_variants.sql
begin;

/*
 * Physical TCG collection projection.
 *
 * User state remains the source of truth. These helpers only normalise the
 * JSONB projections used by profiles and friends, and deliberately keep v1/v2
 * inputs readable while exposing a v3-shaped collection_state.
 */
create or replace function public.tcg_collection_cards_v3(p_cards jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog, public
as $$
  select coalesce(
    jsonb_agg(
      to_jsonb(
        case
          when cardinality(string_to_array(value, '|')) = 2
            then value || '|unspecified|1'
          else value
        end
      ) order by ordinal
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements_text(
    case when jsonb_typeof(p_cards) = 'array' then p_cards else '[]'::jsonb end
  ) with ordinality as cards(value, ordinal);
$$;

create or replace function public.physical_tcg_collection_state_count(p_state jsonb)
returns integer
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    when jsonb_typeof(p_state) <> 'object' then 0
    else
      (case when jsonb_typeof(p_state -> 'legacyOwnedCards') = 'array'
        then jsonb_array_length(p_state -> 'legacyOwnedCards') else 0 end)
      + (case when jsonb_typeof(p_state -> 'collectionCards') = 'array'
        then (
          select coalesce(sum(
            case
              when cardinality(string_to_array(value, '|')) = 4
                and split_part(value, '|', 4) ~ '^([1-9][0-9]{0,3}|10000)$'
                then split_part(value, '|', 4)::integer
              when cardinality(string_to_array(value, '|')) = 2 then 1
              else 0
            end
          ), 0)::integer
          from jsonb_array_elements_text(p_state -> 'collectionCards') as cards(value)
        )
        else 0 end)
  end;
$$;

create or replace function public.physical_tcg_owned_count(p_data jsonb)
returns integer
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  has_new_model boolean;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    return 0;
  end if;

  /* Empty v2 fields can be appended to a v1 export. Match the client-side
   * migration rules so historical IDs stay physical until attributed. */
  has_new_model := coalesce(p_data ->> 'tcgCollectionModelVersion', '') <> '1'
    and (
      (p_data ->> 'tcgCollectionModelVersion') in ('2', '3')
      or (jsonb_typeof(p_data -> 'tcgLegacyOwnedCards') = 'array'
        and jsonb_array_length(p_data -> 'tcgLegacyOwnedCards') > 0)
      or (jsonb_typeof(p_data -> 'tcgCollectionCards') = 'array'
        and jsonb_array_length(p_data -> 'tcgCollectionCards') > 0)
      or (jsonb_typeof(p_data -> 'tcgCollections') = 'array'
        and jsonb_array_length(p_data -> 'tcgCollections') > 0)
      or (jsonb_typeof(p_data -> 'tcgActiveCollections') = 'array'
        and jsonb_array_length(p_data -> 'tcgActiveCollections') > 0)
    );

  if has_new_model then
    return public.physical_tcg_collection_state_count(jsonb_build_object(
      'legacyOwnedCards', case
        when jsonb_typeof(p_data -> 'tcgLegacyOwnedCards') = 'array'
          then p_data -> 'tcgLegacyOwnedCards'
        else '[]'::jsonb
      end,
      'collectionCards', case
        when jsonb_typeof(p_data -> 'tcgCollectionCards') = 'array'
          then p_data -> 'tcgCollectionCards'
        else '[]'::jsonb
      end
    ));
  end if;

  /* v1 has one deduplicated compatibility list. */
  return public.distinct_tcg_owned_count(p_data -> 'tcgOwnedCards');
end;
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
    tcg_owned_count = public.physical_tcg_owned_count(v_data),
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

create or replace function public.sync_friend_snapshots()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_data jsonb;
  v_collection_state jsonb;
  v_model text;
begin
  if tg_op = 'DELETE' then
    delete from public.friend_collection_snapshots where user_id = old.user_id;
    delete from public.friend_deck_snapshots where user_id = old.user_id;
    return old;
  end if;

  v_data := new.data;
  v_model := v_data ->> 'tcgCollectionModelVersion';
  v_collection_state := jsonb_build_object(
    /* Always expose the latest projection shape; v1/v2 values are upgraded
     * to unspecified x1 tokens without rewriting user_state. */
    'modelVersion', 3,
    'browseLanguage', case when jsonb_typeof(v_data -> 'tcgBrowseLanguage') = 'string' then v_data -> 'tcgBrowseLanguage' else null end,
    'collections', case when jsonb_typeof(v_data -> 'tcgCollections') = 'array' then v_data -> 'tcgCollections' else '[]'::jsonb end,
    'collectionCards', public.tcg_collection_cards_v3(v_data -> 'tcgCollectionCards'),
    'activeCollections', case when jsonb_typeof(v_data -> 'tcgActiveCollections') = 'array' then v_data -> 'tcgActiveCollections' else '[]'::jsonb end,
    'legacyOwnedCards', case
      when v_model = '1' then case when jsonb_typeof(v_data -> 'tcgOwnedCards') = 'array' then v_data -> 'tcgOwnedCards' else '[]'::jsonb end
      when v_model in ('2', '3') then case when jsonb_typeof(v_data -> 'tcgLegacyOwnedCards') = 'array' then v_data -> 'tcgLegacyOwnedCards' else '[]'::jsonb end
      when jsonb_typeof(v_data -> 'tcgLegacyOwnedCards') = 'array'
        and jsonb_array_length(v_data -> 'tcgLegacyOwnedCards') > 0 then v_data -> 'tcgLegacyOwnedCards'
      when jsonb_typeof(v_data -> 'tcgCollectionCards') = 'array'
        and jsonb_array_length(v_data -> 'tcgCollectionCards') > 0 then '[]'::jsonb
      when jsonb_typeof(v_data -> 'tcgCollections') = 'array'
        and jsonb_array_length(v_data -> 'tcgCollections') > 0 then '[]'::jsonb
      when jsonb_typeof(v_data -> 'tcgOwnedCards') = 'array' then v_data -> 'tcgOwnedCards'
      else '[]'::jsonb
    end
  );

  insert into public.friend_collection_snapshots (user_id, card_ids, collection_state)
  values (
    new.user_id,
    coalesce(array(
      select distinct card_id
      from (
        select lower(btrim(value)) as card_id
        from jsonb_array_elements_text(v_collection_state -> 'legacyOwnedCards') as legacy(value)
        union all
        select lower(btrim(split_part(value, '|', 2))) as card_id
        from jsonb_array_elements_text(v_collection_state -> 'collectionCards') as collection_cards(value)
      ) projected
      where card_id <> ''
    ), '{}'),
    v_collection_state
  )
  on conflict (user_id) do update set
    card_ids = excluded.card_ids,
    collection_state = excluded.collection_state;

  insert into public.friend_deck_snapshots (user_id, decks)
  values (
    new.user_id,
    case when jsonb_typeof(v_data -> 'tcgDecks') = 'array'
      then v_data -> 'tcgDecks' else '[]'::jsonb end
  )
  on conflict (user_id) do update set decks = excluded.decks;
  return new;
end;
$$;

/* Historical snapshots only have distinct card IDs, so keep those IDs as
 * unspecified legacy possessions rather than manufacturing variants/price. */
update public.friend_collection_snapshots
set collection_state = jsonb_build_object(
  'modelVersion', 3,
  'browseLanguage', null,
  'collections', '[]'::jsonb,
  'collectionCards', '[]'::jsonb,
  'activeCollections', '[]'::jsonb,
  'legacyOwnedCards', to_jsonb(card_ids)
)
where collection_state is null or collection_state = '{}'::jsonb;

/* Upgrade non-empty v1/v2 projections already materialised by 0003. This
 * rewrites only the friend-facing projection; user_state remains untouched
 * and the historical card IDs stay unqualified when no legacy field exists. */
update public.friend_collection_snapshots snapshot
set collection_state = jsonb_build_object(
  'modelVersion', 3,
  'browseLanguage', case
    when jsonb_typeof(snapshot.collection_state -> 'browseLanguage') = 'string'
      then snapshot.collection_state -> 'browseLanguage'
    else null
  end,
  'collections', case
    when jsonb_typeof(snapshot.collection_state -> 'collections') = 'array'
      then snapshot.collection_state -> 'collections'
    else '[]'::jsonb
  end,
  'collectionCards', public.tcg_collection_cards_v3(snapshot.collection_state -> 'collectionCards'),
  'activeCollections', case
    when jsonb_typeof(snapshot.collection_state -> 'activeCollections') = 'array'
      then snapshot.collection_state -> 'activeCollections'
    else '[]'::jsonb
  end,
  'legacyOwnedCards', case
    when jsonb_typeof(snapshot.collection_state -> 'legacyOwnedCards') = 'array'
      then snapshot.collection_state -> 'legacyOwnedCards'
    when jsonb_typeof(snapshot.collection_state -> 'collectionCards') = 'array'
      and jsonb_array_length(snapshot.collection_state -> 'collectionCards') > 0
      then '[]'::jsonb
    else to_jsonb(snapshot.card_ids)
  end
)
where snapshot.collection_state is not null
  and coalesce(snapshot.collection_state ->> 'modelVersion', '') <> '3';

/* Keep the compact friend index distinct after projecting every historical
 * state, including snapshots that predate collection_state entirely. */
update public.friend_collection_snapshots snapshot
set card_ids = coalesce(array(
  select distinct card_id
  from (
    select lower(btrim(value)) as card_id
    from jsonb_array_elements_text(snapshot.collection_state -> 'legacyOwnedCards') as legacy(value)
    union all
    select lower(btrim(split_part(value, '|', 2))) as card_id
    from jsonb_array_elements_text(snapshot.collection_state -> 'collectionCards') as collection_cards(value)
  ) projected
  where card_id <> ''
), '{}');

/* Recalculate the profile projection only; user_state and its possessions are
 * intentionally untouched by this migration. */
update public.profiles profiles
set tcg_owned_count = public.physical_tcg_owned_count(user_state.data)
from public.user_state
join app.users on app.users.id = user_state.user_id
where profiles.id = user_state.user_id
  and app.users.deletion_state = 'active';

commit;

-- Source schema migration: 0005_tcg_sealed_portfolio.sql
-- Account-backed Pokémon sealed-product portfolio.
--
-- Cardmarket catalogue and prices are global source data. Transactions and
-- derived portfolio data are private and always carry the authenticated
-- account id; the API remains the authorization boundary for this schema.

begin;

create table if not exists public.tcg_sealed_products (
  cardmarket_product_id integer primary key check (cardmarket_product_id > 0),
  name text not null check (char_length(name) between 1 and 1000),
  category_id integer not null check (category_id > 0),
  category_name text not null check (char_length(category_name) between 1 and 200),
  expansion_id integer not null check (expansion_id >= 0),
  cardmarket_url text not null,
  image_available boolean not null default true,
  source_at timestamptz not null,
  updated_at timestamptz not null default now(),
  active boolean not null default true
);

create index if not exists tcg_sealed_products_name_idx
  on public.tcg_sealed_products (lower(name) text_pattern_ops);
create index if not exists tcg_sealed_products_category_idx
  on public.tcg_sealed_products (category_id);
create index if not exists tcg_sealed_products_expansion_idx
  on public.tcg_sealed_products (expansion_id);

create table if not exists public.tcg_sealed_price_snapshots (
  cardmarket_product_id integer not null
    references public.tcg_sealed_products (cardmarket_product_id) on delete cascade,
  day date not null,
  source_at timestamptz not null,
  fetched_at timestamptz not null,
  avg_cents bigint check (avg_cents is null or avg_cents >= 0),
  low_cents bigint check (low_cents is null or low_cents >= 0),
  trend_cents bigint check (trend_cents is null or trend_cents >= 0),
  avg1_cents bigint check (avg1_cents is null or avg1_cents >= 0),
  avg7_cents bigint check (avg7_cents is null or avg7_cents >= 0),
  avg30_cents bigint check (avg30_cents is null or avg30_cents >= 0),
  primary key (cardmarket_product_id, day),
  unique (cardmarket_product_id, source_at)
);

create index if not exists tcg_sealed_price_snapshots_day_idx
  on public.tcg_sealed_price_snapshots (day);
create index if not exists tcg_sealed_price_snapshots_product_day_idx
  on public.tcg_sealed_price_snapshots (cardmarket_product_id, day desc);

create table if not exists public.tcg_sealed_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'success', 'failed')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object')
);

create index if not exists tcg_sealed_sync_runs_started_idx
  on public.tcg_sealed_sync_runs (started_at desc);

create table if not exists public.tcg_sealed_settings (
  key text primary key check (char_length(key) between 1 and 100),
  value jsonb not null
);

create table if not exists public.tcg_sealed_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  cardmarket_product_id integer not null
    references public.tcg_sealed_products (cardmarket_product_id),
  date date not null,
  revision integer not null default 1 check (revision > 0),
  kind text not null check (kind in ('buy', 'sell')),
  language text not null default 'unknown'
    check (language in ('unknown', 'en', 'fr', 'es', 'de', 'it', 'ja')),
  quantity integer not null check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  fees_cents bigint not null default 0 check (fees_cents >= 0),
  shipping_cents bigint not null default 0 check (shipping_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  payment_fees_cents bigint not null default 0 check (payment_fees_cents >= 0),
  other_costs_cents bigint not null default 0 check (other_costs_cents >= 0),
  platform text not null default '' check (char_length(platform) <= 512),
  counterparty text not null default '' check (char_length(counterparty) <= 512),
  notes text not null default '' check (char_length(notes) <= 4000),
  storage text not null default '' check (char_length(storage) <= 512),
  allocation_method text not null default 'fifo'
    check (allocation_method in ('fifo', 'manual')),
  selections jsonb not null default '[]'::jsonb
    check (jsonb_typeof(selections) = 'array'),
  voided boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.tcg_sealed_user_revisions (
  user_id uuid primary key references app.users (id) on delete cascade,
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists tcg_sealed_transactions_user_date_idx
  on public.tcg_sealed_transactions (user_id, date, created_at, id);
create index if not exists tcg_sealed_transactions_user_product_idx
  on public.tcg_sealed_transactions (user_id, cardmarket_product_id, date);
create index if not exists tcg_sealed_user_revisions_updated_idx
  on public.tcg_sealed_user_revisions (updated_at desc);

create table if not exists public.tcg_sealed_allocations (
  user_id uuid not null references app.users (id) on delete cascade,
  sale_id uuid not null,
  lot_id uuid not null,
  quantity integer not null check (quantity > 0),
  cost_cents bigint not null check (cost_cents >= 0),
  holding_days numeric(12, 3) not null check (holding_days >= 0),
  primary key (sale_id, lot_id),
  foreign key (sale_id, user_id)
    references public.tcg_sealed_transactions (id, user_id) on delete cascade,
  foreign key (lot_id, user_id)
    references public.tcg_sealed_transactions (id, user_id) on delete restrict
);

create index if not exists tcg_sealed_allocations_user_idx
  on public.tcg_sealed_allocations (user_id);
create index if not exists tcg_sealed_allocations_lot_idx
  on public.tcg_sealed_allocations (lot_id);

create table if not exists public.tcg_sealed_aliases (
  user_id uuid not null references app.users (id) on delete cascade,
  cardmarket_product_id integer not null
    references public.tcg_sealed_products (cardmarket_product_id) on delete cascade,
  alias text not null check (char_length(alias) between 1 and 512),
  updated_at timestamptz not null default now(),
  primary key (user_id, cardmarket_product_id)
);

create index if not exists tcg_sealed_aliases_user_alias_idx
  on public.tcg_sealed_aliases (user_id, lower(alias));

create table if not exists public.tcg_sealed_audit (
  id bigserial primary key,
  user_id uuid not null references app.users (id) on delete cascade,
  transaction_id uuid references public.tcg_sealed_transactions (id) on delete set null,
  action text not null check (action in ('create', 'update', 'void')),
  at timestamptz not null default now(),
  before_data jsonb,
  after_data jsonb
);

create index if not exists tcg_sealed_audit_user_at_idx
  on public.tcg_sealed_audit (user_id, at desc);

create table if not exists public.tcg_sealed_portfolio_daily (
  user_id uuid not null references app.users (id) on delete cascade,
  day date not null,
  transaction_revision integer not null check (transaction_revision >= 0),
  price_revision integer not null check (price_revision >= 0),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  primary key (user_id, day)
);

create index if not exists tcg_sealed_portfolio_daily_user_day_idx
  on public.tcg_sealed_portfolio_daily (user_id, day desc);

drop trigger if exists tcg_sealed_transactions_set_updated_at on public.tcg_sealed_transactions;
create trigger tcg_sealed_transactions_set_updated_at
before update on public.tcg_sealed_transactions
for each row execute function public.set_updated_at();

drop trigger if exists tcg_sealed_user_revisions_set_updated_at on public.tcg_sealed_user_revisions;
create trigger tcg_sealed_user_revisions_set_updated_at
before update on public.tcg_sealed_user_revisions
for each row execute function public.set_updated_at();

drop trigger if exists tcg_sealed_aliases_set_updated_at on public.tcg_sealed_aliases;
create trigger tcg_sealed_aliases_set_updated_at
before update on public.tcg_sealed_aliases
for each row execute function public.set_updated_at();

drop trigger if exists require_active_account_tcg_sealed_transactions on public.tcg_sealed_transactions;
create trigger require_active_account_tcg_sealed_transactions
before insert or update on public.tcg_sealed_transactions
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_tcg_sealed_user_revisions on public.tcg_sealed_user_revisions;
create trigger require_active_account_tcg_sealed_user_revisions
before insert or update on public.tcg_sealed_user_revisions
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_tcg_sealed_allocations on public.tcg_sealed_allocations;
create trigger require_active_account_tcg_sealed_allocations
before insert or update on public.tcg_sealed_allocations
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_tcg_sealed_aliases on public.tcg_sealed_aliases;
create trigger require_active_account_tcg_sealed_aliases
before insert or update on public.tcg_sealed_aliases
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_tcg_sealed_audit on public.tcg_sealed_audit;
create trigger require_active_account_tcg_sealed_audit
before insert or update on public.tcg_sealed_audit
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_tcg_sealed_portfolio_daily on public.tcg_sealed_portfolio_daily;
create trigger require_active_account_tcg_sealed_portfolio_daily
before insert or update on public.tcg_sealed_portfolio_daily
for each row execute function public.require_active_account('user_id');

commit;

-- Source schema migration: 0006_tcg_sealed_exchanges.sql
-- Additive support for atomic sealed-product exchanges.
-- Existing buy/sell rows keep NULL values in the exchange-give columns.

begin;

alter table public.tcg_sealed_transactions
  drop constraint if exists tcg_sealed_transactions_kind_check;

alter table public.tcg_sealed_transactions
  add column if not exists exchange_give_product_id integer
    references public.tcg_sealed_products (cardmarket_product_id),
  add column if not exists exchange_give_language text,
  add column if not exists exchange_give_quantity integer;

alter table public.tcg_sealed_transactions
  add constraint tcg_sealed_transactions_kind_check
    check (kind in ('buy', 'sell', 'exchange')),
  add constraint tcg_sealed_transactions_exchange_shape_check
    check (
      (
        kind = 'exchange'
        and exchange_give_product_id is not null
        and exchange_give_language in ('unknown', 'en', 'fr', 'es', 'de', 'it', 'ja')
        and exchange_give_quantity is not null
        and exchange_give_quantity > 0
        and unit_price_cents = 0
        and fees_cents = 0
        and shipping_cents = 0
        and discount_cents = 0
        and payment_fees_cents = 0
        and other_costs_cents = 0
      )
      or
      (
        kind in ('buy', 'sell')
        and exchange_give_product_id is null
        and exchange_give_language is null
        and exchange_give_quantity is null
      )
    );

create index if not exists tcg_sealed_transactions_user_exchange_give_idx
  on public.tcg_sealed_transactions (user_id, exchange_give_product_id, date);

commit;

-- Source schema migration: 0007_public_api.sql
-- Public Lunidex API keys, per-account quotas, usage counters, and write
-- idempotency. Secrets are stored only as SHA-256 digests.

begin;

-- Gives every sealed mutation a unique transactional guard. This prevents a
-- stale expected revision from matching the revision written by another call.
alter table public.tcg_sealed_user_revisions
  add column if not exists last_mutation_id uuid;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  key_prefix text not null check (char_length(key_prefix) between 1 and 48),
  key_hash char(64) not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  permission text not null check (permission in ('read', 'read_write')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_user_active_idx
  on public.api_keys (user_id, created_at desc)
  where revoked_at is null;

drop trigger if exists require_active_account_api_keys on public.api_keys;
create trigger require_active_account_api_keys
before insert or update on public.api_keys
for each row execute function public.require_active_account('user_id');

create table if not exists public.api_quota_buckets (
  subject_key text not null,
  bucket_type text not null check (bucket_type in (
    'read_minute', 'write_minute', 'read_day', 'write_day',
    'cards_day', 'cards_global_day', 'sealed_day', 'sealed_global_day'
  )),
  window_start timestamptz not null,
  request_count integer not null check (request_count >= 0),
  limit_count integer not null check (limit_count > 0),
  primary key (subject_key, bucket_type, window_start)
);

create index if not exists api_quota_buckets_window_idx
  on public.api_quota_buckets (window_start);

create table if not exists public.api_usage_daily (
  day date not null,
  api_key_id uuid not null references public.api_keys (id) on delete cascade,
  endpoint text not null check (char_length(endpoint) between 1 and 100),
  status_family smallint not null check (status_family between 1 and 5),
  request_count integer not null default 0 check (request_count >= 0),
  last_at timestamptz not null default now(),
  primary key (day, api_key_id, endpoint, status_family)
);

create index if not exists api_usage_daily_key_day_idx
  on public.api_usage_daily (api_key_id, day desc);

create table if not exists public.api_idempotency (
  user_id uuid not null references app.users (id) on delete cascade,
  key_hash char(64) not null check (key_hash ~ '^[0-9a-f]{64}$'),
  request_hash char(64) not null check (request_hash ~ '^[0-9a-f]{64}$'),
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, key_hash)
);

create index if not exists api_idempotency_expiry_idx
  on public.api_idempotency (expires_at);

drop trigger if exists require_active_account_api_idempotency on public.api_idempotency;
create trigger require_active_account_api_idempotency
before insert or update on public.api_idempotency
for each row execute function public.require_active_account('user_id');

commit;

-- Source schema migration: 0008_tcg_qualified_price_history.sql
-- Comparable TCG price observations. Legacy rows stay untouched because they
-- do not identify printing language, finish, source metric, or quote scope.

begin;

create table if not exists public.tcg_price_history_qualified (
  id bigserial primary key,
  card_id text not null check (char_length(card_id) between 1 and 128),
  set_id text not null check (char_length(set_id) between 1 and 80),
  card_language text not null check (card_language in (
    'en', 'fr', 'es', 'it', 'pt', 'pt-br', 'pt-pt', 'de', 'nl', 'pl', 'ru', 'ja', 'ko', 'zh-tw', 'id', 'th', 'zh-cn'
  )),
  cardmarket_product_id integer not null check (cardmarket_product_id > 0),
  variant text not null check (variant in ('normal', 'holo', 'reverse')),
  market_language_scope text not null default 'aggregate' check (market_language_scope = 'aggregate'),
  condition_scope text not null default 'aggregate' check (condition_scope = 'aggregate'),
  source text not null check (source = 'tcgdex-cardmarket'),
  metric text not null check (metric = 'trend'),
  currency char(3) not null check (currency = 'EUR'),
  value numeric(12, 4) not null check (value > 0),
  source_observed_at timestamptz not null,
  source_day date generated always as ((source_observed_at at time zone 'UTC')::date) stored,
  collected_at timestamptz not null default now(),
  unique (card_id, card_language, cardmarket_product_id, set_id, variant, source, metric, currency, source_day)
);

create index if not exists tcg_price_history_qualified_series_idx
  on public.tcg_price_history_qualified (card_id, card_language, variant, source_day desc);

create index if not exists tcg_price_history_qualified_collected_at_idx
  on public.tcg_price_history_qualified (collected_at);

comment on table public.tcg_price_history_qualified is
  'Qualified daily TCGdex/Cardmarket trend observations; source quotes aggregate market language and card condition.';

commit;

-- Source schema migration: 0009_tcg_price_history_refresh_targets.sql
-- Tracks only recently requested card/language pairs for bounded daily refresh.
-- It intentionally stores no account, session, IP, or other user identifier.

begin;

create table if not exists public.tcg_price_history_refresh_targets (
  card_id text not null check (char_length(card_id) between 1 and 128),
  card_language text not null check (card_language in (
    'en', 'fr', 'es', 'it', 'pt', 'pt-br', 'pt-pt', 'de', 'nl', 'pl', 'ru', 'ja', 'ko', 'zh-tw', 'id', 'th', 'zh-cn'
  )),
  last_seen_at timestamptz not null default now(),
  last_checked_at timestamptz,
  primary key (card_id, card_language)
);

create index if not exists tcg_price_history_refresh_targets_due_idx
  on public.tcg_price_history_refresh_targets (last_checked_at asc nulls first, last_seen_at desc, card_id, card_language);

create index if not exists tcg_price_history_refresh_targets_seen_idx
  on public.tcg_price_history_refresh_targets (last_seen_at);

comment on table public.tcg_price_history_refresh_targets is
  'Recently consulted localized card IDs for the capped daily TCGdex/Cardmarket price refresh; contains no user identity.';

commit;

-- Source schema migration: 0010_tcg_custom_collection_shares.sql
begin;

-- One unlisted, revocable read-only link per custom TCG binder. Only the
-- SHA-256 token hash is stored; quantities and prices remain opt-in.
create table if not exists public.tcg_collection_shares (
  user_id uuid not null references app.users (id) on delete cascade,
  collection_id uuid not null,
  token_hash text not null unique,
  show_quantities boolean not null default false,
  show_prices boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, collection_id),
  constraint tcg_collection_shares_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$')
);

comment on table public.tcg_collection_shares is
  'Owner-controlled unlisted read-only links for one custom TCG binder; stores only token hashes and opt-in fields.';

commit;
