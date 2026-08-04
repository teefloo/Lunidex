#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'Erreur: %s\n' "$1" >&2
  exit 1
}

command -v psql >/dev/null 2>&1 || fail "psql est requis (client PostgreSQL)."

source_url="${SUPABASE_DB_URL-}"
target_url="${NEON_DATABASE_URL-}"
[[ -n "$source_url" ]] || fail "Définissez SUPABASE_DB_URL dans l'environnement local."
[[ -n "$target_url" ]] || fail "Définissez NEON_DATABASE_URL dans l'environnement local."

count_rows() {
  local database_url="$1"
  local table_name="$2"
  psql --no-psqlrc --no-password --set=ON_ERROR_STOP=1 \
    --tuples-only --no-align \
    --command="select count(*) from ${table_name}" \
    "$database_url" | tr -d '[:space:]'
}

table_pairs=(
  "auth.users|app.users"
  "public.profiles|public.profiles"
  "public.user_state|public.user_state"
  "public.quiz_scores|public.quiz_scores"
  "public.battle_rooms|public.battle_rooms"
  "public.tcg_price_history|public.tcg_price_history"
  "public.tcg_price_alerts|public.tcg_price_alerts"
  "public.user_push_subscriptions|public.user_push_subscriptions"
  "public.friend_directory|public.friend_directory"
  "public.friendships|public.friendships"
  "public.friend_collection_snapshots|public.friend_collection_snapshots"
  "public.friend_deck_snapshots|public.friend_deck_snapshots"
  "analytics.daily_metrics|analytics.daily_metrics"
)

failed=0
printf 'Comparaison des volumes:\n'
for pair in "${table_pairs[@]}"; do
  source_table="${pair%%|*}"
  target_table="${pair#*|}"
  source_count="$(count_rows "$source_url" "$source_table")"
  target_count="$(count_rows "$target_url" "$target_table")"
  if [[ "$source_count" == "$target_count" ]]; then
    printf '  OK %-38s %s\n' "$source_table -> $target_table" "$source_count"
  else
    printf '  ECART %-35s source=%s cible=%s\n' "$source_table -> $target_table" "$source_count" "$target_count"
    failed=1
  fi
done

object_check="$(
  psql --no-psqlrc --no-password --set=ON_ERROR_STOP=1 \
    --tuples-only --no-align "$target_url" <<'SQL'
with required_tables(schema_name, table_name) as (
  values
    ('app', 'users'),
    ('public', 'profiles'),
    ('public', 'user_state'),
    ('public', 'quiz_scores'),
    ('public', 'battle_rooms'),
    ('public', 'tcg_price_history'),
    ('public', 'tcg_price_alerts'),
    ('public', 'user_push_subscriptions'),
    ('public', 'friend_directory'),
    ('public', 'friendships'),
    ('public', 'friend_collection_snapshots'),
    ('public', 'friend_deck_snapshots'),
    ('analytics', 'daily_metrics')
),
required_indexes(index_name) as (
  values
    ('profiles_public_handle_unique'),
    ('profiles_handle_lookup'),
    ('quiz_scores_date_score_idx'),
    ('idx_battle_rooms_player1'),
    ('idx_battle_rooms_player2'),
    ('idx_battle_rooms_created_at'),
    ('idx_price_history_card_id'),
    ('tcg_price_alerts_user_id_idx'),
    ('user_push_subscriptions_user_endpoint_unique'),
    ('friend_directory_handle_unique'),
    ('friendships_pair_unique'),
    ('friendships_requester_status'),
    ('friendships_addressee_status')
),
required_functions(schema_name, function_name) as (
  values
    ('analytics', 'increment_daily_metric'),
    ('public', 'set_updated_at'),
    ('public', 'caught_by_generation'),
    ('public', 'sync_public_profile_from_user_state'),
    ('public', 'enforce_friendship_transition'),
    ('public', 'sync_friend_directory'),
    ('public', 'sync_friend_snapshots')
)
select concat(
  (select count(*) from required_tables r
   where exists (
     select 1 from information_schema.tables t
     where t.table_schema = r.schema_name and t.table_name = r.table_name
   )) = (select count(*) from required_tables),
  '|',
  (select count(*) from required_indexes r
   where exists (
     select 1 from pg_indexes i
     where i.schemaname = 'public' and i.indexname = r.index_name
   )) = (select count(*) from required_indexes),
  '|',
  (select count(*) from information_schema.table_constraints
   where constraint_type = 'FOREIGN KEY'
     and table_schema in ('app', 'public')
     and table_name in (
       'users', 'profiles', 'user_state', 'quiz_scores', 'battle_rooms',
       'tcg_price_alerts', 'user_push_subscriptions', 'friend_directory',
       'friendships', 'friend_collection_snapshots', 'friend_deck_snapshots'
     )) >= 13,
  '|',
  (select count(*) from information_schema.triggers
   where trigger_schema in ('public', 'analytics')) >= 11,
  '|',
  (select count(*) from required_functions r
   where exists (
     select 1
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = r.schema_name and p.proname = r.function_name
   )) = (select count(*) from required_functions),
  '|',
  (select count(*) from information_schema.views
   where (table_schema, table_name) in (
     ('public', 'public_profiles'),
     ('analytics', 'weekly_funnel')
   )) = 2,
  '|',
  exists (select 1 from pg_extension where extname = 'pgcrypto'),
  '|',
  (select count(*) from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'tcg_price_history_id_seq') = 1
);
SQL
)"

IFS='|' read -r tables indexes foreign_keys triggers functions views extension sequence <<< "$object_check"
printf 'Vérification des objets Neon: tables=%s index=%s FK=%s triggers=%s fonctions=%s vues=%s pgcrypto=%s séquence=%s\n' \
  "$tables" "$indexes" "$foreign_keys" "$triggers" "$functions" "$views" "$extension" "$sequence"

for result in "$tables" "$indexes" "$foreign_keys" "$triggers" "$functions" "$views" "$extension" "$sequence"; do
  [[ "$result" == "t" ]] || failed=1
done

if [[ "$failed" -ne 0 ]]; then
  fail "La vérification a détecté un écart. Ne basculez pas le trafic."
fi

printf 'Vérification réussie. Gardez Supabase disponible jusqu''à la validation fonctionnelle et au canary.\n'
