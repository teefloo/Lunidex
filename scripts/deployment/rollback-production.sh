#!/usr/bin/env bash
set -Eeuo pipefail

readonly image_pattern='^ghcr\.io/teefloo/lunidex@sha256:[0-9a-f]{64}$'
rollback_mode='manual'
case "${1:-}" in
  '') ;;
  --last-stable) rollback_mode='last-stable' ;;
  *)
    echo 'Usage: rollback-production.sh [--last-stable]' >&2
    exit 64
    ;;
esac

cd /opt/lunidex-production
if [[ ! -f .env || ! -f app.env ]]; then
  echo 'Production environment files are missing.' >&2
  exit 78
fi
rollback_image_ref="$(sed -n 's/^SUPABASE_ROLLBACK_IMAGE_REF=//p' .env | tail -n 1)"
if [[ ! "$rollback_image_ref" =~ $image_pattern ]]; then
  echo 'No configured Supabase-compatible rollback image is available.' >&2
  exit 78
fi
docker pull "$rollback_image_ref"
rollback_backend="$(docker image inspect --format '{{ index .Config.Labels "com.lunidex.backend" }}' "$rollback_image_ref")"
if [[ "$rollback_backend" != 'supabase' ]]; then
  echo 'Configured rollback image is not labelled as Supabase-compatible.' >&2
  exit 78
fi
exec 9>.deploy.lock
if ! flock -n 9; then
  echo 'Another production deployment is already running.' >&2
  exit 75
fi

declare -a candidates=()
if [[ "$rollback_mode" == 'last-stable' ]]; then
  previous_stable_ref="$(cat .previous-image-ref 2>/dev/null || true)"
  source /opt/lunidex-production/scripts/deployment/rollback-candidates.sh
  mapfile -t candidates < <(production_last_stable_candidates "$previous_stable_ref" "$rollback_image_ref")
fi
if ((${#candidates[@]} == 0)); then
  candidates+=("$rollback_image_ref")
fi

write_image_ref() {
  local image_ref="$1" tmp
  tmp="$(mktemp .env.XXXXXX)"
  awk -v image_ref="$image_ref" '
    BEGIN { updated = 0 }
    /^APP_IMAGE_TAG=/ { next }
    /^APP_IMAGE_REF=/ { print "APP_IMAGE_REF=" image_ref; updated = 1; next }
    { print }
    END { if (!updated) print "APP_IMAGE_REF=" image_ref }
  ' .env > "$tmp"
  chmod 0600 "$tmp"
  mv "$tmp" .env
}

wait_for_app() {
  local attempt status
  for attempt in $(seq 1 45); do
    status="$(docker inspect --format '{{.State.Health.Status}}' lunidex-production-app 2>/dev/null || true)"
    [[ "$status" == 'healthy' ]] && return 0
    [[ "$status" == 'unhealthy' ]] && return 1
    sleep 2
  done
  return 1
}

for candidate in "${candidates[@]}"; do
  [[ "$candidate" =~ $image_pattern ]] || {
    echo 'Refusing a rollback reference that is not pinned to a Lunidex GHCR digest.' >&2
    exit 64
  }
  docker pull "$candidate"
  candidate_backend="$(docker image inspect --format '{{ index .Config.Labels "com.lunidex.backend" }}' "$candidate")"
  if [[ "$candidate_backend" != 'supabase' ]]; then
    echo 'Skipping a rollback candidate that is not labelled as Supabase-compatible.' >&2
    continue
  fi
  echo "Trying rollback image $candidate."
  write_image_ref "$candidate"
  if docker compose -f compose.production.yaml config --quiet \
    && docker compose -f compose.production.yaml pull app \
    && docker compose -f compose.production.yaml up -d --no-deps app \
    && wait_for_app \
    && bash /opt/lunidex-production/scripts/deployment/healthcheck-production.sh; then
    printf '%s\n' "$candidate" > .previous-image-ref
    chmod 0600 .previous-image-ref
    echo "Rollback image $candidate is healthy."
    exit 0
  fi
  echo "Rollback image $candidate failed health validation." >&2
done

echo 'All rollback candidates failed; inspect Docker and app logs immediately.' >&2
exit 1
