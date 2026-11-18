#!/usr/bin/env bash
set -Eeuo pipefail

cd /opt/lunidex
docker compose ps
docker inspect --format 'app health: {{.State.Health.Status}}' lunidex-app

domain="$(sed -n 's/^LUNIDEX_DOMAIN=//p' .env | tail -n 1)"
if [[ -z "$domain" ]]; then
  echo "LUNIDEX_DOMAIN is not configured." >&2
  exit 78
fi

curl --fail --silent --show-error --max-time 15 \
  --resolve "${domain}:443:127.0.0.1" \
  "https://${domain}/api/healthz" \
  --output /dev/null
printf 'HTTPS healthcheck passed for %s.\n' "$domain"
