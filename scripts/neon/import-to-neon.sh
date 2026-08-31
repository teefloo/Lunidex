#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'Erreur: %s\n' "$1" >&2
  exit 1
}

command -v pg_restore >/dev/null 2>&1 || fail "pg_restore est requis (client PostgreSQL)."
command -v psql >/dev/null 2>&1 || fail "psql est requis (client PostgreSQL)."

target_url="${NEON_DATABASE_URL-}"
[[ -n "$target_url" ]] || fail "Définissez NEON_DATABASE_URL dans l'environnement local."

project_dir="$(pwd)"
migration_dir="$project_dir/.neon-migration"
dump_file="$migration_dir/supabase-app.dump"
users_file="$migration_dir/app-users.csv"

mapfile -t schema_files < <(
  find "$project_dir/neon/migrations" -maxdepth 1 -type f -name '*.sql' -print | sort
)

[[ -s "$dump_file" ]] || fail "Export absent: $dump_file"
[[ -s "$users_file" ]] || fail "Export Auth absent: $users_file"
[[ "${#schema_files[@]}" -gt 0 ]] || fail "Aucune migration Neon trouvée."
for schema_file in "${schema_files[@]}"; do
  [[ -s "$schema_file" ]] || fail "Migration vide: $schema_file"
done

printf 'Création du schéma Neon cible...\n'
for schema_file in "${schema_files[@]}"; do
  printf '  Application de %s\n' "${schema_file##*/}"
  psql --no-psqlrc --no-password --set=ON_ERROR_STOP=1 --file="$schema_file" "$target_url"
done

data_tables=(
  public.profiles
  public.user_state
  public.quiz_scores
  public.battle_rooms
  public.tcg_price_history
  public.tcg_price_alerts
  public.user_push_subscriptions
  public.friend_directory
  public.friendships
  public.friend_collection_snapshots
  public.friend_deck_snapshots
  analytics.daily_metrics
)

reenable_triggers() {
  status=$?
  set +e
  for table_name in "${data_tables[@]}"; do
    psql --no-psqlrc --no-password --set=ON_ERROR_STOP=1 \
      --command="alter table ${table_name} enable trigger user" \
      "$target_url" >/dev/null 2>&1
  done
  exit "$status"
}

printf 'Désactivation temporaire des triggers de projection pendant le chargement...\n'
for table_name in "${data_tables[@]}"; do
  psql --no-psqlrc --no-password --set=ON_ERROR_STOP=1 \
    --command="alter table ${table_name} disable trigger user" \
    "$target_url"
done
trap reenable_triggers EXIT

printf 'Import des identifiants utilisateurs stables...\n'
psql \
  --no-psqlrc \
  --no-password \
  --set=ON_ERROR_STOP=1 \
  --set=users_file="$users_file" \
  "$target_url" <<'SQL'
create temporary table app_users_import (
  id uuid not null,
  created_at timestamptz not null
);
\copy app_users_import (id, created_at) from :'users_file' with (format csv)
insert into app.users (id, created_at)
select id, created_at
from app_users_import
on conflict (id) do nothing;
SQL

printf 'Import des tables applicatives...\n'
for table_name in "${data_tables[@]}"; do
  pg_restore \
    --data-only \
    --no-owner \
    --no-acl \
    --exit-on-error \
    --dbname="$target_url" \
    --table="$table_name" \
    "$dump_file"
done

printf 'Rafraîchissement des projections et des séquences...\n'
psql --no-psqlrc --no-password --set=ON_ERROR_STOP=1 "$target_url" <<'SQL'
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

insert into public.friend_collection_snapshots (user_id, card_ids, collection_state)
select
  user_id,
  coalesce(
    array(
      select distinct card_id
      from (
        select lower(btrim(value)) as card_id
        from jsonb_array_elements_text(
          case
            when (data ->> 'tcgCollectionModelVersion') = '1'
              and jsonb_typeof(data -> 'tcgOwnedCards') = 'array'
              then data -> 'tcgOwnedCards'
            when jsonb_typeof(data -> 'tcgLegacyOwnedCards') = 'array'
              then data -> 'tcgLegacyOwnedCards'
            when coalesce(data ->> 'tcgCollectionModelVersion', '') not in ('2', '3')
              and jsonb_typeof(data -> 'tcgOwnedCards') = 'array'
              then data -> 'tcgOwnedCards'
            else '[]'::jsonb
          end
        ) as legacy(value)
        union all
        select lower(btrim(split_part(value, '|', 2))) as card_id
        from jsonb_array_elements_text(case
          when jsonb_typeof(data -> 'tcgCollectionCards') = 'array'
            then data -> 'tcgCollectionCards' else '[]'::jsonb end
        ) as collection_cards(value)
      ) projected
      where card_id <> ''
    ),
    '{}'
  ),
  jsonb_build_object(
    'modelVersion', 3,
    'browseLanguage', case
      when jsonb_typeof(data -> 'tcgBrowseLanguage') = 'string'
        then data -> 'tcgBrowseLanguage'
      else null
    end,
    'collections', case when jsonb_typeof(data -> 'tcgCollections') = 'array'
      then data -> 'tcgCollections' else '[]'::jsonb end,
    'collectionCards', public.tcg_collection_cards_v3(data -> 'tcgCollectionCards'),
    'activeCollections', case when jsonb_typeof(data -> 'tcgActiveCollections') = 'array'
      then data -> 'tcgActiveCollections' else '[]'::jsonb end,
    'legacyOwnedCards', case
      when (data ->> 'tcgCollectionModelVersion') = '1'
        and jsonb_typeof(data -> 'tcgOwnedCards') = 'array' then data -> 'tcgOwnedCards'
      when (data ->> 'tcgCollectionModelVersion') in ('2', '3')
        and jsonb_typeof(data -> 'tcgLegacyOwnedCards') = 'array' then data -> 'tcgLegacyOwnedCards'
      when jsonb_typeof(data -> 'tcgLegacyOwnedCards') = 'array'
        and jsonb_array_length(data -> 'tcgLegacyOwnedCards') > 0 then data -> 'tcgLegacyOwnedCards'
      when jsonb_typeof(data -> 'tcgCollectionCards') = 'array'
        and jsonb_array_length(data -> 'tcgCollectionCards') > 0 then '[]'::jsonb
      when coalesce(data ->> 'tcgCollectionModelVersion', '') not in ('2', '3')
        and jsonb_typeof(data -> 'tcgOwnedCards') = 'array' then data -> 'tcgOwnedCards'
      else '[]'::jsonb
    end
  )
from public.user_state
on conflict (user_id) do update set
  card_ids = excluded.card_ids,
  collection_state = excluded.collection_state;

insert into public.friend_deck_snapshots (user_id, decks)
select
  user_id,
  case when jsonb_typeof(data -> 'tcgDecks') = 'array'
    then data -> 'tcgDecks' else '[]'::jsonb end
from public.user_state
on conflict (user_id) do update set decks = excluded.decks;

update public.profiles profiles
set tcg_owned_count = public.physical_tcg_owned_count(user_state.data)
from public.user_state
join app.users on app.users.id = user_state.user_id
where profiles.id = user_state.user_id
  and app.users.deletion_state = 'active';

select setval(
  pg_get_serial_sequence('public.tcg_price_history', 'id'),
  coalesce((select max(id) from public.tcg_price_history), 1),
  (select count(*) > 0 from public.tcg_price_history)
);
SQL

printf 'Import terminé. Supabase n''a pas été modifié et aucun objet Neon n''a été supprimé.\n'
