#!/usr/bin/env bash
set -Eeuo pipefail

new_tag="${1:-}"
if [[ ! "$new_tag" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Deployment tag must be a full 40-character Git SHA." >&2
  exit 64
fi

cd /opt/lunidex
if [[ ! -f .env || ! -f app.env || ! -f cloudflare-ips.env ]]; then
  echo "Create .env, app.env, and cloudflare-ips.env before deploying." >&2
  exit 78
fi

required_runtime_vars=(
  NEON_DATABASE_URL
  NEON_AUTH_BASE_URL
  NEON_AUTH_JWKS_URL
  NEON_AUTH_COOKIE_SECRET
  NEON_AUTH_JWT_ISSUER
  NEON_AUTH_JWT_AUDIENCE
  LUNIDEX_CRON_SECRET
)
missing_runtime_vars=()
for variable in "${required_runtime_vars[@]}"; do
  if ! grep -Eq "^${variable}=.+$" app.env; then
    missing_runtime_vars+=("$variable")
  fi
done
if ((${#missing_runtime_vars[@]})); then
  printf 'Missing required server variable names in app.env:' >&2
  printf ' %s' "${missing_runtime_vars[@]}" >&2
  printf '\n' >&2
  exit 78
fi

domain="$(sed -n 's/^LUNIDEX_DOMAIN=//p' .env | tail -n 1)"
domain="${domain,,}"
domain="${domain%.}"
hostnames="$(sed -n 's/^LUNIDEX_HOSTNAMES=//p' .env | tail -n 1)"
hostnames="${hostnames,,}"
hostnames="${hostnames%.}"
if [[ "$domain" != "vps-test.lunidex.app" || "$hostnames" != "vps-test.lunidex.app" ]]; then
  echo "This deployment script only permits vps-test.lunidex.app." >&2
  exit 78
fi

current_tag="$(sed -n 's/^APP_IMAGE_TAG=//p' .env | tail -n 1)"
if [[ "$current_tag" == "0000000000000000000000000000000000000000" ]]; then
  current_tag=""
fi

set_image_tag() {
  local tag="$1"
  local tmp
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
    status="$(docker inspect --format '{{.State.Health.Status}}' lunidex-app 2>/dev/null || true)"
    if [[ "$status" == "healthy" ]]; then return 0; fi
    if [[ "$status" == "unhealthy" ]]; then return 1; fi
    sleep 2
  done
  return 1
}

wait_for_https() {
  local attempt
  for attempt in $(seq 1 36); do
    if curl --fail --silent --max-time 10 \
      --resolve "${domain}:443:127.0.0.1" \
      "https://${domain}/api/healthz" --output /dev/null; then
      return 0
    fi
    sleep 5
  done
  return 1
}

rollback() {
  local exit_code=$?
  trap - ERR
  if [[ -n "$current_tag" && "$current_tag" != "$new_tag" ]]; then
    echo "Deployment failed; restoring the previous image." >&2
    set_image_tag "$current_tag"
    if docker compose pull app && docker compose up -d --no-deps app && wait_for_app; then
      echo "Previous image is healthy again." >&2
    else
      echo "Automatic rollback did not become healthy; inspect Docker and app logs." >&2
    fi
  else
    echo "Deployment failed and no prior image tag was configured for automatic rollback." >&2
  fi
  exit "$exit_code"
}

trap rollback ERR
docker compose config --quiet
set_image_tag "$new_tag"
docker compose pull app
docker compose up -d --no-deps app
wait_for_app
docker compose up -d caddy
wait_for_https

if [[ -n "$current_tag" && "$current_tag" != "$new_tag" ]]; then
  printf '%s\n' "$current_tag" > .previous-image-tag
  chmod 0600 .previous-image-tag
fi
trap - ERR
echo "Lunidex image $new_tag is healthy."
