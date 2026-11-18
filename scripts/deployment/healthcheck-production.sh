#!/usr/bin/env bash
set -Eeuo pipefail

cd /opt/lunidex-production
docker compose -f compose.production.yaml ps
docker inspect --format 'production app health: {{.State.Health.Status}}' lunidex-production-app

node_check="$(cat <<'NODE'
const response = await fetch(process.env.NEON_AUTH_JWKS_URL, { signal: AbortSignal.timeout(10000) });
if (!response.ok) process.exit(1);
const payload = await response.json();
if (!payload || !Array.isArray(payload.keys)) process.exit(1);
console.log('Neon Auth JWKS endpoint responded with a key set.');
NODE
)"
docker compose -f compose.production.yaml exec -T app node --input-type=module -e "$node_check"

sql_check="$(cat <<'NODE'
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.NEON_DATABASE_URL, {
  readOnly: true,
  fetchOptions: { signal: AbortSignal.timeout(10000) },
});
const [rows] = await sql.transaction([sql`select 1 as ok`]);
if (Number(rows[0]?.ok) !== 1) process.exit(1);
console.log('Production Neon read-only connectivity check passed (SELECT 1 only; no test data written).');
NODE
)"
docker compose -f compose.production.yaml exec -T app node --input-type=module -e "$sql_check"
