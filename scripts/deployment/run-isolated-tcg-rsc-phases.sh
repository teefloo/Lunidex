#!/usr/bin/env bash
set -Eeuo pipefail

readonly EXPECTED_IMAGE='ghcr.io/teefloo/lunidex:ca08758609fb5cfefafff6d5c2aaee31ddc56f63'
readonly EXPECTED_DURATION_SECONDS=900
readonly CACHE_VOLUME='lunidex-isolated-rsc-cache'
readonly INTERNAL_NETWORK='lunidex-isolated-rsc-internal'

if [[ "${APP_IMAGE:-}" != "$EXPECTED_IMAGE" || "${PHASE_SECONDS:-}" != "$EXPECTED_DURATION_SECONDS" ]]; then
  echo 'diagnostic_configuration_not_pinned=true' >&2
  exit 78
fi

remove_phase() {
  local phase="$1"
  docker rm --force "lunidex-isolated-rsc-$phase-app" "lunidex-isolated-rsc-$phase-anchor" >/dev/null 2>&1 || true
}

run_phase() {
  local phase="$1"
  local anchor="lunidex-isolated-rsc-$phase-anchor"
  local app="lunidex-isolated-rsc-$phase-app"
  local summary=''
  local inspect_output=''

  remove_phase "$phase"
  if ! docker run --detach \
    --name "$anchor" \
    --network "$INTERNAL_NETWORK" \
    --cpus 0.05 \
    --memory 64m \
    --memory-swap 64m \
    --pids-limit 32 \
    --read-only \
    --tmpfs /tmp:rw,noexec,nosuid,size=8m \
    --cap-drop ALL \
    --security-opt no-new-privileges:true \
    --env NODE_OPTIONS= \
    --entrypoint node \
    "$APP_IMAGE" -e 'setInterval(() => {}, 60000)' >/dev/null 2>&1; then
    echo "${phase}_network_anchor_start_failed=true"
    return 1
  fi

  if ! docker run --detach \
    --init \
    --name "$app" \
    --network "container:$anchor" \
    --cpus 1 \
    --memory 2176m \
    --memory-swap 2176m \
    --pids-limit 256 \
    --read-only \
    --tmpfs /tmp:rw,noexec,nosuid,size=64m \
    --cap-drop ALL \
    --security-opt no-new-privileges:true \
    --mount "type=volume,source=$CACHE_VOLUME,target=/app/.next/cache" \
    --env NODE_ENV=production \
    --env NEXT_TELEMETRY_DISABLED=1 \
    --env HOSTNAME=0.0.0.0 \
    --env PORT=3000 \
    --env NODE_OPTIONS='--max-old-space-size=1024 --inspect=127.0.0.1:9229 --expose-gc' \
    --env SENTRY_DSN= \
    --env NEXT_PUBLIC_SENTRY_DSN= \
    --env NEXT_PUBLIC_POSTHOG_ENABLED=false \
    "$APP_IMAGE" >/dev/null 2>&1; then
    echo "${phase}_app_start_failed=true"
    remove_phase "$phase"
    return 1
  fi

  local ready=false
  for _ in $(seq 1 30); do
    if docker run --rm \
      --network "container:$anchor" \
      --cpus 0.05 \
      --memory 32m \
      --memory-swap 32m \
      --read-only \
      --tmpfs /tmp:rw,noexec,nosuid,size=8m \
      --cap-drop ALL \
      --security-opt no-new-privileges:true \
      --env NODE_OPTIONS= \
      "$APP_IMAGE" node -e \
      'fetch("http://127.0.0.1:3000/api/healthz", { signal: AbortSignal.timeout(1500) }).then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))' \
      >/dev/null 2>&1; then
      ready=true
      break
    fi
    if [[ "$(docker inspect --format '{{.State.Running}}' "$app" 2>/dev/null || true)" != true ]]; then
      break
    fi
    sleep 2
  done
  echo "${phase}_app_ready=$ready"
  if [[ "$ready" != true ]]; then
    inspect_output="$(docker inspect --format 'running={{.State.Running}} oom={{.State.OOMKilled}} exit={{.State.ExitCode}}' "$app" 2>/dev/null || true)"
    if [[ -n "$inspect_output" ]]; then
      echo "${phase}_container_state=$inspect_output"
    else
      echo "${phase}_container_state=unavailable"
    fi
    remove_phase "$phase"
    return 1
  fi

  local helper_exit=0
  summary="$(timeout 925s docker run --rm \
    --network "container:$anchor" \
    --cpus 0.25 \
    --memory 128m \
    --memory-swap 128m \
    --pids-limit 64 \
    --read-only \
    --tmpfs /tmp:rw,noexec,nosuid,size=16m \
    --cap-drop ALL \
    --security-opt no-new-privileges:true \
    --mount "type=bind,src=$GITHUB_WORKSPACE/scripts/deployment/isolated-tcg-rsc-load.mjs,dst=/tmp/diagnostic.mjs,readonly" \
    --env NODE_OPTIONS= \
    --env ISOLATED_TCG_PHASE="$phase" \
    --env ISOLATED_TCG_DURATION_SECONDS="$PHASE_SECONDS" \
    "$APP_IMAGE" node /tmp/diagnostic.mjs 2>/dev/null)" || helper_exit=$?

  if [[ -n "$summary" ]]; then
    if ! printf '%s\n' "$summary" | node scripts/deployment/validate-isolated-tcg-rsc-summary.mjs "$phase"; then
      echo "${phase}_summary_valid=false"
      remove_phase "$phase"
      return 1
    fi
  else
    echo "${phase}_summary_missing=true helper_exit=$helper_exit"
    remove_phase "$phase"
    return 1
  fi

  inspect_output="$(docker inspect --format 'running={{.State.Running}} oom={{.State.OOMKilled}} exit={{.State.ExitCode}}' "$app" 2>/dev/null || true)"
  if [[ -n "$inspect_output" ]]; then
    echo "${phase}_container_state=$inspect_output"
  else
    echo "${phase}_container_state=unavailable"
  fi

  remove_phase "$phase"
}

result=0
run_phase full || result=1
run_phase abort || result=1
exit "$result"
