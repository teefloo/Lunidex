#!/usr/bin/env bash

# Probe every public route even if an earlier endpoint returns an unexpected
# HTTP status. The final exit code still fails the inspection step.
set -Eeuo pipefail

: "${GITHUB_OUTPUT:?GITHUB_OUTPUT must point to the step output file}"

probe_failed=0
tls_verify_result=0
tls_failure_recorded=false

probe() {
  local name="$1" path="$2" expected="$3"
  local response='' status='000' duration='unavailable' tls='unavailable' curl_exit=0

  if response="$(curl --max-time 20 --silent --show-error --output /dev/null \
    --write-out '%{http_code}|%{time_total}|%{ssl_verify_result}' \
    "https://lunidex.app${path}")"; then
    curl_exit=0
  else
    curl_exit=$?
  fi

  if [[ "$response" == *'|'*'|'* ]]; then
    IFS='|' read -r status duration tls <<< "$response"
  fi

  printf '%s status=%s duration=%ss tls_verify_result=%s expected=%s curl_exit=%s\n' \
    "$name" "$status" "$duration" "$tls" "$expected" "$curl_exit"
  printf '%s_status=%s\n' "$name" "$status" >> "$GITHUB_OUTPUT"

  if [[ "$tls" != '0' ]]; then
    if [[ "$tls_failure_recorded" == false ]]; then
      tls_verify_result="$tls"
      tls_failure_recorded=true
    fi
    probe_failed=1
  fi
  if [[ "$curl_exit" != '0' || "$status" != "$expected" ]]; then
    probe_failed=1
  fi
}

probe healthz /api/healthz 200
probe home /en 200
probe tcg /en/tcg 200
probe manifest /manifest.webmanifest 200
probe service_worker /sw.js 200
probe auth_session /api/auth/get-session 200
probe profile /api/profile 401

printf 'tls_verify_result=%s\n' "$tls_verify_result" >> "$GITHUB_OUTPUT"
exit "$probe_failed"
