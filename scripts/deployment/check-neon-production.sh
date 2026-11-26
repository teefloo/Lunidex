#!/usr/bin/env bash
set -Eeuo pipefail

endpoint="${1:-https://lunidex.app/api/auth/get-session}"
if [[ "$endpoint" != 'https://lunidex.app/api/auth/get-session' ]]; then
  echo 'Neon Auth availability probe is restricted to the production session endpoint.' >&2
  exit 64
fi

status="$(curl --silent --show-error --max-time 10 --output /dev/null --write-out '%{http_code}' "$endpoint")" || {
  echo 'Neon Auth availability probe could not reach the session endpoint.' >&2
  exit 1
}

case "$status" in
  200)
    echo 'Neon Auth session endpoint is reachable (anonymous response only; no authenticated session was tested).'
    ;;
  402)
    echo 'Neon Auth is unavailable: HTTP 402 quota response. This is a provider/functionality failure, not a Node process-health failure.' >&2
    exit 1
    ;;
  *)
    echo "Neon Auth session endpoint returned HTTP $status; provider functionality is unavailable." >&2
    exit 1
    ;;
esac
