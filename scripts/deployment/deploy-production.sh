#!/usr/bin/env bash
set -Eeuo pipefail

new_tag="${1:-}"
mode="${2:-preflight}"
if [[ ! "$new_tag" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Deployment tag must be a full 40-character Git SHA." >&2
  exit 64
fi
if [[ "$mode" != "preflight" && "$mode" != "deploy" ]]; then
  echo "Mode must be preflight or deploy." >&2
  exit 64
fi

cd /opt/lunidex-production
if [[ ! -f .env || ! -f app.env || ! -f /opt/lunidex/.env || ! -f /opt/lunidex/compose.yaml ]]; then
  echo "Production env files and the shared Caddy stack must exist before deployment." >&2
  exit 78
fi

required_runtime_vars=(
  NEON_DATABASE_URL
  NEON_AUTH_BASE_URL
  NEON_AUTH_JWKS_URL
  NEON_AUTH_COOKIE_SECRET
  LUNIDEX_CRON_SECRET
)
missing_runtime_vars=()
for variable in "${required_runtime_vars[@]}"; do
  if ! grep -Eq "^${variable}=.+$" app.env; then
    missing_runtime_vars+=("${variable}")
  fi
done
if (("${#missing_runtime_vars[@]}")); then
  printf 'Missing required server variable names in production app.env:' >&2
  printf ' %s' "${missing_runtime_vars[@]}" >&2
  printf '\n' >&2
  exit 78
fi

previous_tag="$(sed -n 's/^APP_IMAGE_TAG=//p' .env | tail -n 1)"
if [[ "$previous_tag" == "0000000000000000000000000000000000000000" ]]; then previous_tag=""; fi

mem_available_kb="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
if [[ ! "$mem_available_kb" =~ ^[0-9]+$ ]] || ((mem_available_kb < 1572864)); then
  echo "Not enough available RAM for the bounded production preflight (need at least 1.5 GiB free)." >&2
  exit 75
fi
disk_available_kb="$(df -Pk / | awk 'NR == 2 {print $4}')"
if [[ ! "$disk_available_kb" =~ ^[0-9]+$ ]] || ((disk_available_kb < 2097152)); then
  echo "Not enough free disk space for a production image rollback window (need at least 2 GiB)." >&2
  exit 75
fi
if [[ "$mode" == "deploy" ]]; then
  preproduction_running="$(docker inspect --format '{{.State.Running}}' lunidex-app 2>/dev/null || true)"
  if [[ "$preproduction_running" == "true" ]]; then
    echo "Refusing a durable production start while the preproduction app is running on this 4 GiB VPS." >&2
    echo "Complete the resource audit and stop the preproduction app explicitly before selecting deploy mode." >&2
    exit 75
  fi
fi

write_image_tag() {
  local tag="$1" tmp
  tmp="$(mktemp .env.XXXXXX)"
  awk -v tag="$tag" '
    BEGIN { updated = 0 }
    /^APP_IMAGE_TAG=/ { print "APP_IMAGE_TAG=" tag; updated = 1; next }
    { print }
    END { if (!updated) print "APP_IMAGE_TAG=" tag }
  ' .env > "$tmp"
  chmod 0600 "$tmp"
  mv "$tmp" .env
}

wait_for_app() {
  local attempt status
  for attempt in $(seq 1 45); do
    status="$(docker inspect --format '{{.State.Health.Status}}' lunidex-production-app 2>/dev/null || true)"
    if [[ "$status" == "healthy" ]]; then return 0; fi
    if [[ "$status" == "unhealthy" ]]; then return 1; fi
    sleep 2
  done
  return 1
}

rollback() {
  local exit_code=$?
  trap - ERR
  if [[ -n "$previous_tag" && "$previous_tag" != "$new_tag" ]]; then
    echo "Production deployment failed; restoring the previously recorded image." >&2
    write_image_tag "$previous_tag"
    if docker compose -f compose.production.yaml pull app \
      && docker compose -f compose.production.yaml up -d --no-deps app \
      && wait_for_app; then
      echo "The previous production image is healthy again." >&2
    else
      echo "Automatic rollback did not become healthy; inspect the production app container." >&2
      docker compose -f compose.production.yaml stop app >/dev/null 2>&1 || true
    fi
  else
    echo "Deployment failed and no previous production image SHA is recorded." >&2
    write_image_tag "0000000000000000000000000000000000000000"
    docker compose -f compose.production.yaml stop app >/dev/null 2>&1 || true
  fi
  if [[ "$mode" == "preflight" && "$was_running" != "true" ]]; then
    docker compose -f compose.production.yaml stop app >/dev/null 2>&1 || true
  fi
  exit "$exit_code"
}

was_running="$(docker inspect --format '{{.State.Running}}' lunidex-production-app 2>/dev/null || true)"
was_running="${was_running:-false}"
if [[ "$mode" == "preflight" && "$was_running" == "true" ]]; then
  echo "Preflight mode refuses to replace an already running production app." >&2
  exit 78
fi
trap rollback ERR
docker compose -f compose.production.yaml config --quiet
write_image_tag "$new_tag"
docker compose -f compose.production.yaml pull app
docker compose -f compose.production.yaml up -d --no-deps app
wait_for_app

if [[ -n "$previous_tag" && "$previous_tag" != "$new_tag" ]]; then
  printf '%s\n' "$previous_tag" > .previous-image-tag
  chmod 0600 .previous-image-tag
fi
if [[ "$mode" == "preflight" ]]; then
  bash /opt/lunidex-production/scripts/deployment/preflight-production.sh
  if [[ -n "$previous_tag" ]]; then
    write_image_tag "$previous_tag"
  else
    write_image_tag "0000000000000000000000000000000000000000"
  fi
  docker compose -f compose.production.yaml stop app >/dev/null
  trap - ERR
  echo "Production preflight passed; candidate app stopped and prior image selection restored."
  exit 0
fi
trap - ERR
echo "Production image $new_tag is healthy (mode: $mode)."
