#!/usr/bin/env bash
set -Eeuo pipefail

cd /opt/lunidex-production
docker compose -f compose.production.yaml ps
status="$(docker inspect --format '{{.State.Health.Status}}' lunidex-production-app)"
[[ "$status" == 'healthy' ]] || {
  echo "Production app process/container health is $status." >&2
  exit 1
}
docker compose -f compose.production.yaml exec -T app node --input-type=module -e \
  "const response = await fetch('http://127.0.0.1:3000/api/healthz', { signal: AbortSignal.timeout(5000) }); if (!response.ok) process.exit(1); const payload = await response.json(); if (payload.status !== 'ok') process.exit(1); console.log('Production app process health passed; this check does not query Supabase Auth or PostgreSQL.');"
