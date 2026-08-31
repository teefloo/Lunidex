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
