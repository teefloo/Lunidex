#!/usr/bin/env bash
set -Eeuo pipefail

repo_root=/opt/lunidex
production_root=/opt/lunidex-production
caddy_container=lunidex-caddy
temp_dir="$(mktemp -d /tmp/lunidex-production-preflight.XXXXXX)"
headers_file="$temp_dir/response-headers"
trap 'docker compose -f "$repo_root/compose.yaml" exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || true; docker compose -f "$production_root/compose.production.yaml" stop app >/dev/null 2>&1 || true; rm -rf "$temp_dir"' EXIT

cd "$production_root"
bash /opt/lunidex-production/scripts/deployment/healthcheck-production.sh

report_resources() {
  local phase="$1"
  printf '%s\n' "--- VPS resources: $phase ---"
  uptime
  free -h
  df -h / /opt
  docker stats --no-stream \
    --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}'
}

report_resources "candidate running before probes"

docker cp "$production_root/deploy/production/Caddyfile.production.preflight" "$caddy_container:/data/Caddyfile.production.preflight"
docker exec "$caddy_container" caddy validate --config /data/Caddyfile.production.preflight --adapter caddyfile
docker exec "$caddy_container" caddy reload --config /data/Caddyfile.production.preflight --adapter caddyfile

request_status() {
  local host="$1" path="$2"
  curl --insecure --silent --show-error --max-time 20 \
    --resolve "$host:443:127.0.0.1" \
    --dump-header "$headers_file" \
    --output /dev/null --write-out '%{http_code}' \
    "https://$host$path"
}

expect_status() {
  local host="$1" path="$2" expected="$3" actual
  actual="$(request_status "$host" "$path")"
  if [[ "$actual" != "$expected" ]]; then
    echo "Preflight request failed: $path on $host returned HTTP $actual; expected $expected." >&2
    return 1
  fi
}

expect_redirect() {
  local host="$1" path="$2" expected="$3" expected_location="$4" actual location
  actual="$(request_status "$host" "$path")"
  if [[ "$actual" != "$expected" ]]; then
    echo "Preflight request failed: $path on $host returned HTTP $actual; expected $expected." >&2
    return 1
  fi

  location="$(awk 'tolower($1) == "location:" { sub(/^[^:]*:[[:space:]]*/, ""); gsub(/\r/, ""); value = $0 } END { print value }' "$headers_file")"
  if [[ "$location" != "$expected_location" ]]; then
    echo "Preflight request failed: $path on $host redirected to '$location'; expected '$expected_location'." >&2
    return 1
  fi
}

for path in \
  /api/healthz \
  /en \
  /en/pokemon/pikachu \
  /en/tcg \
  /manifest.webmanifest \
  /robots.txt \
  /sitemap.xml \
  /sw.js; do
  expect_status lunidex.app "$path" 200
done

expect_status lunidex.app /api/profile 401
expect_status lunidex.app /api/cron/metrics-retention 401
expect_status lunidex.app /api/cron/tcg-sealed-sync 401
# www is an intentional legacy host. Next's host redirect canonicalizes it to
# the apex over HTTPS, so verify the redirect target instead of expecting the
# health handler to run on the alias.
expect_redirect www.lunidex.app /api/healthz 308 https://lunidex.app/api/healthz

session_body="$temp_dir/anonymous-session.json"
auth_session_meta="$(curl --insecure --silent --show-error --max-time 20 \
  --resolve lunidex.app:443:127.0.0.1 \
  --output "$session_body" --write-out '%{http_code} %{content_type}' \
  https://lunidex.app/api/auth/get-session)"
auth_session_status="${auth_session_meta%% *}"
auth_session_content_type="${auth_session_meta#* }"
if [[ "$auth_session_status" != "200" || "$auth_session_content_type" != application/json* ]]; then
  echo "Neon Auth anonymous session endpoint returned an unexpected status or content type." >&2
  exit 1
fi
node --input-type=module -e '
  import { readFileSync } from "node:fs";
  let payload;
  try {
    payload = JSON.parse(readFileSync(process.argv[1], "utf8"));
  } catch {
    console.error("Neon Auth session response was not valid JSON.");
    process.exit(1);
  }
  if (payload !== null) {
    console.error("Neon Auth did not return the expected anonymous JSON null.");
    process.exit(1);
  }
' "$session_body"
echo "Neon Auth anonymous session path returned HTTP 200 with JSON null."

curl --insecure --silent --show-error --max-time 20 \
  --resolve lunidex.app:443:127.0.0.1 \
  --dump-header "$headers_file" --output /dev/null \
  https://lunidex.app/en
for header in strict-transport-security content-security-policy x-content-type-options x-frame-options; do
  if ! grep -qi "^$header:" "$headers_file"; then
    echo "Expected security response header is missing: $header." >&2
    exit 1
  fi
done

report_resources "after preflight probes"
echo "Production preflight passed over private internal TLS. Public DNS and public Caddy routing were not changed."
