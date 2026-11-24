#!/usr/bin/env bash
set -Eeuo pipefail

base_url="${1:-https://lunidex.app}"
if [[ "$base_url" != 'https://lunidex.app' ]]; then
  echo 'Production smoke checks are restricted to https://lunidex.app.' >&2
  exit 64
fi

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT

check_status_200() {
  local route="$1" status
  status="$(curl --silent --show-error --location --max-redirs 3 --connect-timeout 5 --max-time 20 \
    --output "$response_file" --write-out '%{http_code}' "$base_url$route")"
  if [[ "$status" != '200' ]]; then
    echo "Public production smoke check failed for $route (HTTP $status)." >&2
    return 1
  fi
}

check_status_200 '/api/healthz'
jq -e '.status == "ok"' "$response_file" >/dev/null || {
  echo 'Public /api/healthz returned HTTP 200 without the expected healthy payload.' >&2
  exit 1
}
check_status_200 '/en'
echo 'Public HTTPS smoke checks passed for /api/healthz and /en.'
