#!/usr/bin/env bash
set -Eeuo pipefail

cd /opt/lunidex-production
tag="${1:-}"
if [[ -z "$tag" ]]; then tag="$(cat .previous-image-tag 2>/dev/null || true)"; fi
if [[ ! "$tag" =~ ^[0-9a-f]{40}$ ]]; then
  echo "No valid previous production image SHA is recorded." >&2
  exit 78
fi

tmp="$(mktemp .env.XXXXXX)"
awk -v tag="$tag" '
  BEGIN { updated = 0 }
  /^APP_IMAGE_TAG=/ { print "APP_IMAGE_TAG=" tag; updated = 1; next }
  { print }
  END { if (!updated) print "APP_IMAGE_TAG=" tag }
' .env > "$tmp"
chmod 0600 "$tmp"
mv "$tmp" .env
docker compose -f compose.production.yaml config --quiet
docker compose -f compose.production.yaml pull app
docker compose -f compose.production.yaml up -d --no-deps app
for attempt in $(seq 1 45); do
  status="$(docker inspect --format '{{.State.Health.Status}}' lunidex-production-app 2>/dev/null || true)"
  [[ "$status" == "healthy" ]] && { echo "Previous production image $tag is healthy."; exit 0; }
  [[ "$status" == "unhealthy" ]] && break
  sleep 2
done
echo "Previous production image $tag did not become healthy." >&2
exit 1
