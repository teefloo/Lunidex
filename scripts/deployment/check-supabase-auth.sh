#!/usr/bin/env bash
set -Eeuo pipefail

supabase_url="${1:-}"
publishable_key="${2:-${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}}"
if [[ -z "$supabase_url" ]]; then
  echo 'Pass the public Supabase project URL.' >&2
  exit 64
fi
if [[ -z "$publishable_key" ]]; then
  echo 'Pass the public Supabase publishable key for the Auth health request.' >&2
  exit 64
fi
if [[ ! "$supabase_url" =~ ^https://[a-zA-Z0-9.-]+/?$ ]]; then
  echo 'The Supabase Auth probe accepts only an HTTPS project origin.' >&2
  exit 64
fi

endpoint="${supabase_url%/}/auth/v1/health"
status="$(curl --silent --show-error --max-time 10 --output /dev/null --write-out '%{http_code}' \
  --header "apikey: $publishable_key" "$endpoint")" || {
  echo 'Supabase Auth health probe could not reach the configured project.' >&2
  exit 1
}

case "$status" in
  200|204)
    echo 'Supabase Auth health endpoint responded with the project publishable key; this confirms provider reachability only, not signed-in session functionality.'
    ;;
  *)
    echo "Supabase Auth health endpoint returned HTTP $status." >&2
    exit 1
    ;;
esac
