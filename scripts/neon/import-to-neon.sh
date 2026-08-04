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
schema_file="$project_dir/neon/migrations/0001_lunidex_app.sql"

[[ -s "$dump_file" ]] || fail "Export absent: $dump_file"
[[ -s "$users_file" ]] || fail "Export Auth absent: $users_file"
[[ -s "$schema_file" ]] || fail "Migration absente: $schema_file"

printf 'Création du schéma Neon cible...\n'
psql --no-psqlrc --no-password --set=ON_ERROR_STOP=1 --file="$schema_file" "$target_url"

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

insert into public.friend_collection_snapshots (user_id, card_ids)
select
  user_id,
  coalesce(
    array(
      select distinct jsonb_array_elements_text(
        case when jsonb_typeof(data -> 'tcgOwnedCards') = 'array'
          then data -> 'tcgOwnedCards' else '[]'::jsonb end
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
    then data -> 'tcgDecks' else '[]'::jsonb end
from public.user_state
on conflict (user_id) do update set decks = excluded.decks;

select setval(
  pg_get_serial_sequence('public.tcg_price_history', 'id'),
  coalesce((select max(id) from public.tcg_price_history), 1),
  (select count(*) > 0 from public.tcg_price_history)
);
SQL

printf 'Import terminé. Supabase n''a pas été modifié et aucun objet Neon n''a été supprimé.\n'
