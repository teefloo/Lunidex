#!/usr/bin/env bash
set -Eeuo pipefail

new_image_ref="${1:-}"
expected_commit="${2:-}"
mode="${3:-deploy}"
rollback_image_ref="${4:-}"

if [[ ! "$new_image_ref" =~ ^ghcr\.io/teefloo/lunidex@sha256:[0-9a-f]{64}$ ]]; then
  echo 'Deployment requires a digest-pinned ghcr.io/teefloo/lunidex image reference.' >&2
  exit 64
fi
if [[ ! "$expected_commit" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Deployment requires the full expected source commit SHA.' >&2
  exit 64
fi
if [[ "$mode" != 'deploy' ]]; then
  echo 'Production preflight is GitHub-only and cannot run on this VPS.' >&2
  exit 64
fi
if [[ ! "$rollback_image_ref" =~ ^ghcr\.io/teefloo/lunidex@sha256:[0-9a-f]{64}$ ]]; then
  echo 'Production requires a separately verified Supabase-compatible digest-pinned rollback image.' >&2
  exit 78
fi

cd /opt/lunidex-production
if [[ ! -f .env || ! -f app.env || ! -f /opt/lunidex/.env || ! -f /opt/lunidex/compose.yaml ]]; then
  echo 'Production env files and the shared Caddy stack must exist before deployment.' >&2
  exit 78
fi
source /opt/lunidex-production/scripts/deployment/production-memory-gate.sh

required_runtime_vars=(SUPABASE_DATABASE_URL LUNIDEX_CRON_SECRET)
missing_runtime_vars=()
for variable in "${required_runtime_vars[@]}"; do
  if ! grep -Eq "^${variable}=.+$" app.env; then missing_runtime_vars+=("${variable}"); fi
done
if ! grep -Eq '^SUPABASE_SECRET_KEY=.+$' app.env \
  && ! grep -Eq '^SUPABASE_SERVICE_ROLE_KEY=.+$' app.env; then
  missing_runtime_vars+=('SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY (legacy fallback)')
fi
if ((${#missing_runtime_vars[@]})); then
  printf 'Missing required server variable names in production app.env:' >&2
  printf ' %s' "${missing_runtime_vars[@]}" >&2
  printf '\n' >&2
  exit 78
fi
bash /opt/lunidex-production/scripts/deployment/require-supabase-ca.sh

write_rollback_ref() {
  local image_ref="$1" tmp
  tmp="$(mktemp .env.XXXXXX)"
  awk -v image_ref="$image_ref" '
    BEGIN { updated = 0 }
    /^SUPABASE_ROLLBACK_IMAGE_REF=/ { print "SUPABASE_ROLLBACK_IMAGE_REF=" image_ref; updated = 1; next }
    { print }
    END { if (!updated) print "SUPABASE_ROLLBACK_IMAGE_REF=" image_ref }
  ' .env > "$tmp"
  chmod 0600 "$tmp"
  mv "$tmp" .env
}

docker pull "$rollback_image_ref"
rollback_backend="$(docker image inspect --format '{{ index .Config.Labels "com.lunidex.backend" }}' "$rollback_image_ref")"
if [[ "$rollback_backend" != 'supabase' ]]; then
  echo 'Rollback image does not carry the Supabase backend compatibility label.' >&2
  exit 78
fi

exec 9>.deploy.lock
if ! flock -n 9; then
  echo 'Another production deployment is already running.' >&2
  exit 75
fi

previous_image_ref="$(sed -n 's/^APP_IMAGE_REF=//p' .env | tail -n 1)"
running_image_ref="$(docker inspect --format '{{.Config.Image}}' lunidex-production-app 2>/dev/null || true)"
running_backend="$(docker inspect --format '{{ index .Config.Labels "com.lunidex.backend" }}' lunidex-production-app 2>/dev/null || true)"
was_running="$(docker inspect --format '{{.State.Running}}' lunidex-production-app 2>/dev/null || true)"
container_health="$(docker inspect --format '{{.State.Health.Status}}' lunidex-production-app 2>/dev/null || true)"
mapfile -t rollback_candidates < <(
  source /opt/lunidex-production/scripts/deployment/rollback-candidates.sh
  production_rollback_candidates \
    "$previous_image_ref" \
    "$running_image_ref" \
    "${was_running:-false}" \
    "$container_health" \
    "$rollback_image_ref" \
    "$running_backend"
)
if ((${#rollback_candidates[@]} == 0)); then
  echo 'No Supabase-compatible rollback candidate is available; refusing production deployment.' >&2
  exit 78
fi
if [[ "$previous_image_ref" == "$new_image_ref" ]]; then
  echo 'The requested immutable image is already selected.' >&2
  exit 64
fi
was_running="$(docker inspect --format '{{.State.Running}}' lunidex-production-app 2>/dev/null || true)"
was_running="${was_running:-false}"
memory_gate_decision="$(production_memory_gate_decision "$mode" "$was_running")" || {
  echo 'Could not determine the production RAM guard for this deployment state.' >&2
  exit 64
}
if [[ "$memory_gate_decision" == 'enforce' ]]; then
  mem_available_kb="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
  if [[ ! "$mem_available_kb" =~ ^[0-9]+$ ]] || ((mem_available_kb < 1572864)); then
    echo 'Not enough available RAM to start production (need at least 1.5 GiB free).' >&2
    exit 75
  fi
else
  echo 'The running production app will be replaced in place; no parallel app instance will be started.'
fi
disk_available_kb="$(df -Pk / | awk 'NR == 2 {print $4}')"
if [[ ! "$disk_available_kb" =~ ^[0-9]+$ ]] || ((disk_available_kb < 2097152)); then
  echo 'Not enough free disk space for a production image rollback window (need at least 2 GiB).' >&2
  exit 75
fi
preproduction_running="$(docker inspect --format '{{.State.Running}}' lunidex-app 2>/dev/null || true)"
if [[ "$preproduction_running" == 'true' ]]; then
  echo 'Refusing a durable production start while the preproduction app is running on this 4 GiB VPS.' >&2
  echo 'Stop and audit preproduction explicitly before selecting deploy mode.' >&2
  exit 75
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
    if [[ "$status" == 'healthy' ]]; then return 0; fi
    if [[ "$status" == 'unhealthy' ]]; then return 1; fi
    sleep 2
  done
  return 1
}

rollback_to_stable() {
  local candidate
  for candidate in "${rollback_candidates[@]}"; do
    echo "Candidate deployment failed; trying previously healthy immutable image $candidate." >&2
    write_image_ref "$candidate"
    if docker compose -f compose.production.yaml config --quiet \
      && docker compose -f compose.production.yaml pull app \
      && docker compose -f compose.production.yaml up -d --no-deps app \
      && wait_for_app \
      && bash /opt/lunidex-production/scripts/deployment/healthcheck-production.sh; then
      printf '%s\n' "$candidate" > .previous-image-ref
      chmod 0600 .previous-image-ref
      echo "Rollback image $candidate is healthy again." >&2
      return 0
    fi
    echo "Rollback candidate $candidate did not become healthy." >&2
  done
  echo 'All rollback candidates failed; inspect Docker and app logs immediately.' >&2
  return 1
}

on_error() {
  local exit_code=$?
  trap - ERR
  rollback_to_stable || true
  exit "$exit_code"
}
APP_IMAGE_REF="$new_image_ref" docker compose -f compose.production.yaml config --quiet
docker pull "$new_image_ref"
actual_revision="$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$new_image_ref")"
actual_backend="$(docker image inspect --format '{{ index .Config.Labels "com.lunidex.backend" }}' "$new_image_ref")"
if [[ "$actual_revision" != "$expected_commit" ]]; then
  echo 'Candidate image revision label does not match the authorized commit.' >&2
  exit 78
fi
if [[ "$actual_backend" != 'supabase' ]]; then
  echo 'Candidate image does not carry the Supabase backend compatibility label.' >&2
  exit 78
fi
trap on_error ERR
write_rollback_ref "$rollback_image_ref"
write_image_ref "$new_image_ref"
docker compose -f compose.production.yaml pull app
docker compose -f compose.production.yaml up -d --no-deps app
wait_for_app
bash /opt/lunidex-production/scripts/deployment/healthcheck-production.sh
printf '%s\n' "${rollback_candidates[0]}" > .previous-image-ref
chmod 0600 .previous-image-ref
trap - ERR
echo "Production image $new_image_ref is healthy. Supabase/Auth availability is reported separately."
