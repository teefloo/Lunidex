#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'Erreur: %s\n' "$1" >&2
  exit 1
}

command -v pg_dump >/dev/null 2>&1 || fail "pg_dump est requis (client PostgreSQL)."
command -v psql >/dev/null 2>&1 || fail "psql est requis (client PostgreSQL)."

source_url="${SUPABASE_DB_URL-}"
[[ -n "$source_url" ]] || fail "Définissez SUPABASE_DB_URL dans l'environnement local."

migration_dir="$(pwd)/.neon-migration"
dump_file="$migration_dir/supabase-app.dump"
users_file="$migration_dir/app-users.csv"

mkdir -p "$migration_dir"
chmod 700 "$migration_dir"

printf 'Export du schéma public/analytics et des données applicatives...\n'
pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --schema=public \
  --schema=analytics \
  --file="$dump_file" \
  "$source_url"

printf 'Export des identifiants Auth nécessaires aux clés étrangères...\n'
psql \
  --no-psqlrc \
  --no-password \
  --set=ON_ERROR_STOP=1 \
  --command="copy (select id, created_at from auth.users order by id) to stdout with (format csv)" \
  "$source_url" > "$users_file"

chmod 600 "$dump_file" "$users_file"
printf 'Export terminé dans .neon-migration/ (aucun secret n''a été écrit dans le dépôt).\n'
