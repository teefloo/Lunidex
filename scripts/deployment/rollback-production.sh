#!/usr/bin/env bash
set -Eeuo pipefail

readonly rollback_image_ref='ghcr.io/teefloo/lunidex@sha256:9ca8f66d0b5f79a984358d12fe1c382319df7364388ec2d5df78fe3c5afc318a'
requested_image_ref="${1:-$rollback_image_ref}"
if [[ "$requested_image_ref" != "$rollback_image_ref" ]]; then
  echo 'Manual production rollback is pinned to the verified d0f5 image digest.' >&2
  exit 64
fi

cd /opt/lunidex-production
if [[ ! -f .env || ! -f app.env ]]; then
  echo 'Production environment files are missing.' >&2
  exit 78
fi
exec 9>.deploy.lock
if ! flock -n 9; then
  echo 'Another production deployment is already running.' >&2
  exit 75
fi

tmp="$(mktemp .env.XXXXXX)"
awk -v image_ref="$rollback_image_ref" '
  BEGIN { updated = 0 }
  /^APP_IMAGE_TAG=/ { next }
  /^APP_IMAGE_REF=/ { print "APP_IMAGE_REF=" image_ref; updated = 1; next }
  { print }
  END { if (!updated) print "APP_IMAGE_REF=" image_ref }
' .env > "$tmp"
chmod 0600 "$tmp"
mv "$tmp" .env
docker compose -f compose.production.yaml config --quiet
docker compose -f compose.production.yaml pull app
docker compose -f compose.production.yaml up -d --no-deps app
for attempt in $(seq 1 45); do
  status="$(docker inspect --format '{{.State.Health.Status}}' lunidex-production-app 2>/dev/null || true)"
  [[ "$status" == 'healthy' ]] && {
    bash /opt/lunidex-production/scripts/deployment/healthcheck-production.sh
    echo "Pinned d0f5 rollback image $rollback_image_ref is healthy."
    exit 0
  }
  [[ "$status" == 'unhealthy' ]] && break
  sleep 2
done
echo 'Pinned d0f5 rollback image did not become healthy; inspect Docker and app logs.' >&2
exit 1
