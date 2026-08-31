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
