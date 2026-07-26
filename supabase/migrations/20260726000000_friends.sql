-- PrimeDex — friends and shareable TCG projections
--
-- Friend-facing reads intentionally never touch public.user_state. The two
-- projection tables below contain only TCG data that may be shared and have
-- independent RLS policies for collection and decks.

alter table public.profiles
  add column if not exists allow_friend_requests boolean not null default true,
  add column if not exists share_tcg_collection boolean not null default false,
  add column if not exists share_tcg_decks boolean not null default false;

create table if not exists public.friend_directory (
  user_id uuid primary key references auth.users (id) on delete cascade,
  handle text,
  display_name text,
  allow_friend_requests boolean not null default true,
  share_tcg_collection boolean not null default false,
  share_tcg_decks boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index if not exists friend_directory_handle_unique
  on public.friend_directory (lower(handle))
  where handle is not null;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_not_self check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_unique
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friendships_requester_status
  on public.friendships (requester_id, status, updated_at desc);

create index if not exists friendships_addressee_status
  on public.friendships (addressee_id, status, updated_at desc);

create table if not exists public.friend_collection_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  card_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_deck_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  decks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists friend_directory_set_updated_at on public.friend_directory;
create trigger friend_directory_set_updated_at
  before update on public.friend_directory
  for each row execute function public.set_updated_at();

drop trigger if exists friendships_set_updated_at on public.friendships;
create trigger friendships_set_updated_at
  before update on public.friendships
  for each row execute function public.set_updated_at();

create or replace function public.enforce_friendship_transition()
returns trigger
language plpgsql
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

drop trigger if exists enforce_friendship_transition_on_update on public.friendships;
create trigger enforce_friendship_transition_on_update
  before update on public.friendships
  for each row execute function public.enforce_friendship_transition();

drop trigger if exists friend_collection_snapshot_set_updated_at on public.friend_collection_snapshots;
create trigger friend_collection_snapshot_set_updated_at
  before update on public.friend_collection_snapshots
  for each row execute function public.set_updated_at();

drop trigger if exists friend_deck_snapshot_set_updated_at on public.friend_deck_snapshots;
create trigger friend_deck_snapshot_set_updated_at
  before update on public.friend_deck_snapshots
  for each row execute function public.set_updated_at();

-- Keep the limited identity/directory projection in sync with profiles.
create or replace function public.sync_friend_directory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.friend_directory (
    user_id,
    handle,
    display_name,
    allow_friend_requests,
    share_tcg_collection,
    share_tcg_decks
  )
  values (
    new.id,
    nullif(trim(new.public_handle), ''),
    coalesce(nullif(trim(new.name), ''), 'Trainer'),
    new.allow_friend_requests,
    new.share_tcg_collection,
    new.share_tcg_decks
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

drop trigger if exists sync_friend_directory_on_profile on public.profiles;
create trigger sync_friend_directory_on_profile
  after insert or update of name, public_handle, allow_friend_requests,
    share_tcg_collection, share_tcg_decks on public.profiles
  for each row execute function public.sync_friend_directory();

insert into public.friend_directory (
  user_id,
  handle,
  display_name,
  allow_friend_requests,
  share_tcg_collection,
  share_tcg_decks
)
select
  id,
  nullif(trim(public_handle), ''),
  coalesce(nullif(trim(name), ''), 'Trainer'),
  allow_friend_requests,
  share_tcg_collection,
  share_tcg_decks
from public.profiles
on conflict (user_id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  allow_friend_requests = excluded.allow_friend_requests,
  share_tcg_collection = excluded.share_tcg_collection,
  share_tcg_decks = excluded.share_tcg_decks;

-- Maintain the two safe projections whenever the local-first JSON snapshot is
-- persisted. The function is trigger-only and is not an application API.
create or replace function public.sync_friend_snapshots()
returns trigger
language plpgsql
security definer
set search_path = public
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
    coalesce(
      array(
        select distinct jsonb_array_elements_text(
          case when jsonb_typeof(new.data -> 'tcgOwnedCards') = 'array'
            then new.data -> 'tcgOwnedCards'
            else '[]'::jsonb
          end
        )
      ),
      '{}'
    )
  )
  on conflict (user_id) do update set card_ids = excluded.card_ids;

  insert into public.friend_deck_snapshots (user_id, decks)
  values (
    new.user_id,
    case when jsonb_typeof(new.data -> 'tcgDecks') = 'array'
      then new.data -> 'tcgDecks'
      else '[]'::jsonb
    end
  )
  on conflict (user_id) do update set decks = excluded.decks;

  return new;
end;
$$;

drop trigger if exists sync_friend_snapshots_on_user_state on public.user_state;
create trigger sync_friend_snapshots_on_user_state
  after insert or update of data or delete on public.user_state
  for each row execute function public.sync_friend_snapshots();

insert into public.friend_collection_snapshots (user_id, card_ids)
select
  user_id,
  coalesce(
    array(
      select distinct jsonb_array_elements_text(
        case when jsonb_typeof(data -> 'tcgOwnedCards') = 'array'
          then data -> 'tcgOwnedCards'
          else '[]'::jsonb
        end
      )
    ),
    '{}'
  )
from public.user_state
on conflict (user_id) do update set card_ids = excluded.card_ids;

insert into public.friend_deck_snapshots (user_id, decks)
select
  user_id,
  case when jsonb_typeof(data -> 'tcgDecks') = 'array'
    then data -> 'tcgDecks'
    else '[]'::jsonb
  end
from public.user_state
on conflict (user_id) do update set decks = excluded.decks;

alter table public.friend_directory enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_collection_snapshots enable row level security;
alter table public.friend_deck_snapshots enable row level security;

drop policy if exists friend_directory_select on public.friend_directory;
create policy friend_directory_select
  on public.friend_directory for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or allow_friend_requests
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = (select auth.uid()) and f.addressee_id = user_id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = user_id)
        )
    )
    or exists (
      select 1 from public.friendships f
      where f.status = 'pending'
        and (
          (f.requester_id = (select auth.uid()) and f.addressee_id = user_id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = user_id)
        )
    )
  );

drop policy if exists friendships_select_participant on public.friendships;
create policy friendships_select_participant
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists friendships_insert_requester on public.friendships;
create policy friendships_insert_requester
  on public.friendships for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and requester_id <> addressee_id
    and exists (
      select 1 from public.friend_directory d
      where d.user_id = addressee_id
        and d.allow_friend_requests = true
    )
  );

drop policy if exists friendships_update_recipient on public.friendships;
create policy friendships_update_recipient
  on public.friendships for update
  to authenticated
  using (addressee_id = (select auth.uid()) and status = 'pending')
  with check (
    addressee_id = (select auth.uid())
    and requester_id <> addressee_id
    and status in ('accepted', 'declined')
  );

drop policy if exists friendships_delete_participant on public.friendships;
create policy friendships_delete_participant
  on public.friendships for delete
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists friend_collection_select_allowed on public.friend_collection_snapshots;
create policy friend_collection_select_allowed
  on public.friend_collection_snapshots for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.friendships f
      join public.friend_directory d on d.user_id = friend_collection_snapshots.user_id
      where f.status = 'accepted'
        and d.share_tcg_collection = true
        and (
          (f.requester_id = (select auth.uid()) and f.addressee_id = friend_collection_snapshots.user_id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = friend_collection_snapshots.user_id)
        )
    )
  );

drop policy if exists friend_decks_select_allowed on public.friend_deck_snapshots;
create policy friend_decks_select_allowed
  on public.friend_deck_snapshots for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.friendships f
      join public.friend_directory d on d.user_id = friend_deck_snapshots.user_id
      where f.status = 'accepted'
        and d.share_tcg_decks = true
        and (
          (f.requester_id = (select auth.uid()) and f.addressee_id = friend_deck_snapshots.user_id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = friend_deck_snapshots.user_id)
        )
    )
  );

grant select on public.friend_directory to authenticated;
grant select on public.friendships to authenticated;
grant insert, update, delete on public.friendships to authenticated;
grant select on public.friend_collection_snapshots to authenticated;
grant select on public.friend_deck_snapshots to authenticated;

create or replace function public.send_friend_request(p_handle text)
returns public.friendships
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_target_id uuid;
  v_existing public.friendships;
  v_result public.friendships;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select user_id into v_target_id
  from public.friend_directory
  where lower(handle) = lower(trim(p_handle))
    and allow_friend_requests = true;

  if v_target_id is null then raise exception 'Friend handle not found'; end if;
  if v_target_id = v_user_id then raise exception 'Cannot add yourself'; end if;

  select * into v_existing
  from public.friendships
  where least(requester_id, addressee_id) = least(v_user_id, v_target_id)
    and greatest(requester_id, addressee_id) = greatest(v_user_id, v_target_id);

  if v_existing.status = 'accepted' then
    return v_existing;
  end if;

  if v_existing.status = 'pending' then
    return v_existing;
  end if;

  if v_existing.id is not null then
    delete from public.friendships where id = v_existing.id;
  end if;

  insert into public.friendships (requester_id, addressee_id, status)
  values (v_user_id, v_target_id, 'pending')
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.respond_to_friend_request(
  p_friendship_id uuid,
  p_action text
)
returns public.friendships
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_result public.friendships;
begin
  if p_action not in ('accept', 'decline') then
    raise exception 'Invalid friend request action';
  end if;

  update public.friendships
  set status = case when p_action = 'accept' then 'accepted' else 'declined' end,
      responded_at = now()
  where id = p_friendship_id
    and addressee_id = (select auth.uid())
    and status = 'pending'
  returning * into v_result;

  if v_result.id is null then raise exception 'Friend request not found'; end if;
  return v_result;
end;
$$;

grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_to_friend_request(uuid, text) to authenticated;
revoke all on function public.sync_friend_directory() from public;
revoke all on function public.sync_friend_snapshots() from public;

create or replace function public.get_friend_collection_page(
  p_friend_id uuid,
  p_cursor text default null,
  p_limit integer default 36
)
returns table (
  card_id text,
  total_owned integer,
  has_more boolean
)
language sql
security invoker
set search_path = public
as $$
  with params as (
    select least(greatest(coalesce(p_limit, 36), 1), 60) as page_size
  ),
  all_owned as (
    select distinct item as card_id
    from public.friend_collection_snapshots s
    cross join unnest(s.card_ids) as cards(item)
    where s.user_id = p_friend_id
  ),
  owned as (
    select card_id
    from all_owned
    where p_cursor is null or card_id > p_cursor
  ),
  ranked as (
    select
      owned.card_id,
      (select count(*)::integer from all_owned) as total_owned,
      row_number() over (order by card_id) as row_number
    from owned
  )
  select
    ranked.card_id,
    ranked.total_owned,
    (select count(*) from ranked) > (select page_size from params) as has_more
  from ranked
  where ranked.row_number <= (select page_size from params)
  order by ranked.card_id;
$$;

create or replace function public.get_friend_collection_summary(p_friend_id uuid)
returns table (total_owned integer, updated_at timestamptz)
language sql
security invoker
set search_path = public
as $$
  select cardinality(card_ids), updated_at
  from public.friend_collection_snapshots
  where user_id = p_friend_id;
$$;

create or replace function public.get_friend_decks(p_friend_id uuid)
returns table (decks jsonb, updated_at timestamptz)
language sql
security invoker
set search_path = public
as $$
  select decks, updated_at
  from public.friend_deck_snapshots
  where user_id = p_friend_id;
$$;

grant execute on function public.get_friend_collection_page(uuid, text, integer) to authenticated;
grant execute on function public.get_friend_collection_summary(uuid) to authenticated;
grant execute on function public.get_friend_decks(uuid) to authenticated;
