#!/usr/bin/env bash
set -Eeuo pipefail

readonly EXPECTED_IMAGE='ghcr.io/teefloo/lunidex:ca08758609fb5cfefafff6d5c2aaee31ddc56f63'
readonly MIN_DURATION_SECONDS=30
readonly MAX_DURATION_SECONDS=3600
readonly MIN_CONCURRENCY=1
readonly MAX_CONCURRENCY=32
readonly CACHE_VOLUME='lunidex-isolated-rsc-cache'
readonly INTERNAL_NETWORK='lunidex-isolated-rsc-internal'
readonly DIAGNOSTIC_PHASE_SECONDS="${PHASE_SECONDS:-0}"
readonly DIAGNOSTIC_CONCURRENCY="${ISOLATED_TCG_CONCURRENCY:-32}"
readonly DIAGNOSTIC_PHASES="${ISOLATED_TCG_PHASES:-full,abort}"
readonly DIAGNOSTIC_TARGET="${ISOLATED_TCG_TARGET:-tcg-card}"

if [[ "${APP_IMAGE:-}" != "$EXPECTED_IMAGE" || ! "$DIAGNOSTIC_PHASE_SECONDS" =~ ^[0-9]+$ || ! "$DIAGNOSTIC_CONCURRENCY" =~ ^[0-9]+$ ]] \
  || (( DIAGNOSTIC_PHASE_SECONDS < MIN_DURATION_SECONDS || DIAGNOSTIC_PHASE_SECONDS > MAX_DURATION_SECONDS )) \
  || (( DIAGNOSTIC_CONCURRENCY < MIN_CONCURRENCY || DIAGNOSTIC_CONCURRENCY > MAX_CONCURRENCY )) \
  || [[ "$DIAGNOSTIC_PHASES" != full && "$DIAGNOSTIC_PHASES" != full,abort ]] \
  || [[ "$DIAGNOSTIC_TARGET" != tcg-card && "$DIAGNOSTIC_TARGET" != healthz ]]; then
  echo 'diagnostic_configuration_not_pinned=true' >&2
  exit 78
fi

remove_phase() {
  local phase="$1"
  docker rm --force "lunidex-isolated-rsc-$phase-app" "lunidex-isolated-rsc-$phase-anchor" >/dev/null 2>&1 || true
}

report_container_state() {
  local phase="$1"
  local app="$2"
  local state_json=''
  local restart_count=''
  local normalized=''

  state_json="$(docker inspect --format '{{json .State}}' "$app" 2>/dev/null || true)"
  if [[ -z "$state_json" ]]; then
    echo "${phase}_container_state=unavailable"
    return 1
  fi
  restart_count="$(docker inspect --format '{{.RestartCount}}' "$app" 2>/dev/null || true)"
  if [[ ! "$restart_count" =~ ^[0-9]+$ ]]; then
    echo "${phase}_container_state=unavailable"
    return 1
  fi

  normalized="$(printf '%s\n' "$state_json" | node "$GITHUB_WORKSPACE/scripts/deployment/normalize-isolated-container-state.mjs" "$restart_count" 2>/dev/null || true)"
  if [[ -z "$normalized" ]]; then
    echo "${phase}_container_state=invalid"
    return 1
  fi
  echo "${phase}_container_state=$normalized"
  printf '%s\n' "$normalized" | bash "$GITHUB_WORKSPACE/scripts/deployment/isolated-container-state-healthy.sh"
}

report_node_logs() {
  local phase="$1"
  local app="$2"
  local result=''
  result="$(docker logs --tail 2000 "$app" 2>&1 | node "$GITHUB_WORKSPACE/scripts/deployment/classify-isolated-node-logs.mjs" 2>/dev/null || true)"
  if [[ "$result" =~ ^\{\"fatal_category\":\"(none|v8_heap_oom|kernel_or_container_oom|uncaught_exception|node_fatal|abort_or_assertion)\", ]]; then
    echo "${phase}_node_log_classification=$result"
  else
    echo "${phase}_node_log_classification=unavailable"
  fi
}

report_helper_error() {
  local phase="$1"
  local helper_error_file="$2"
  local helper_exit="${3:-0}"
  local classify_execution="${4:-false}"
  local category=''
  local launch_classification=''
  local helper_started='false'
  local stderr_signature=''
  local classified_exit=''
  local helper_stderr_without_start_marker=''
  category="$(sed -nE 's/^diagnostic_error_category=([a-z_]+)$/\1/p' "$helper_error_file" | head -n 1)"
  helper_stderr_without_start_marker="$(sed '/^diagnostic_helper_started=true$/d' "$helper_error_file" | tr -d '\n' || true)"
  if grep -qx 'diagnostic_helper_started=true' "$helper_error_file"; then
    helper_started='true'
    echo "${phase}_helper_process_started=true"
  fi
  if [[ "$category" =~ ^(inspector_[a-z_]+|summary_validation_failed|diagnostic_phase_failed|invalid_diagnostic_configuration)$ ]]; then
    echo "${phase}_diagnostic_error_category=$category"
  elif [[ "$classify_execution" == true ]] && (( helper_exit != 0 )); then
    launch_classification="$(node "$GITHUB_WORKSPACE/scripts/deployment/classify-isolated-docker-launch-error.mjs" "$helper_exit" --shell <"$helper_error_file" 2>/dev/null || true)"
    IFS=$'\t' read -r helper_started classified_exit category stderr_signature <<< "$launch_classification"
    if [[ ( "$helper_started" == true || "$helper_started" == false ) && "$classified_exit" == "$helper_exit" && "$category" =~ ^(docker_[a-z_]+|helper_[a-z_]+)$ && ${#stderr_signature} -le 160 ]]; then
      if [[ "$helper_started" == true ]]; then
        echo "${phase}_helper_failure_category=$category exit_code=$helper_exit stderr_signature=$stderr_signature"
      else
        echo "${phase}_docker_exec_failure_category=$category exit_code=$helper_exit stderr_signature=$stderr_signature"
      fi
    else
      echo "${phase}_docker_exec_failure_category=unclassified exit_code=$helper_exit stderr_signature=unavailable"
    fi
  elif [[ -n "$helper_stderr_without_start_marker" ]]; then
    echo "${phase}_diagnostic_error_category=unclassified"
  fi
}

run_phase() {
  local phase="$1"
  local anchor="lunidex-isolated-rsc-$phase-anchor"
  local app="lunidex-isolated-rsc-$phase-app"
  local helper_stdout_file=''
  local helper_stderr_file=''
  local resources_stdout_file=''
  local resources_stderr_file=''
  local helper_exit=0
  local validation_exit=0
  local app_state_exit=0
  local resource_validation_exit=0
  local resource_sampler_exit=0
  local resource_sampler_pid=''
  local resource_stats_status=''
  local summary=''
  local validated_summary=''
  local validated_resources=''

  remove_phase "$phase"
  if ! docker run --detach \
    --name "$anchor" \
    --network "$INTERNAL_NETWORK" \
    --cpus 0.25 \
    --memory 256m \
    --memory-swap 256m \
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
    --env NODE_OPTIONS='--max-old-space-size=1408 --inspect=127.0.0.1:9229 --expose-gc' \
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
    if report_container_state "$phase" "$app"; then
      :
    else
      app_state_exit=$?
    fi
    report_node_logs "$phase" "$app"
    remove_phase "$phase"
    return 1
  fi

  helper_stdout_file="$(mktemp "${RUNNER_TEMP:-/tmp}/lunidex-${phase}-stdout.XXXXXX")"
  helper_stderr_file="$(mktemp "${RUNNER_TEMP:-/tmp}/lunidex-${phase}-stderr.XXXXXX")"
  resources_stdout_file="$(mktemp "${RUNNER_TEMP:-/tmp}/lunidex-${phase}-resources.XXXXXX")"
  resources_stderr_file="$(mktemp "${RUNNER_TEMP:-/tmp}/lunidex-${phase}-resources-stderr.XXXXXX")"
  chmod 600 "$helper_stdout_file" "$helper_stderr_file" "$resources_stdout_file" "$resources_stderr_file"
  node "$GITHUB_WORKSPACE/scripts/deployment/sample-isolated-container-resources.mjs" "$app" \
    >"$resources_stdout_file" 2>"$resources_stderr_file" &
  resource_sampler_pid=$!
  for _ in $(seq 1 25); do
    [[ -s "$resources_stdout_file" ]] && break
    kill -0 "$resource_sampler_pid" 2>/dev/null || break
    sleep 0.2
  done
  if [[ ! -s "$resources_stdout_file" ]]; then
    echo "${phase}_container_resources_initial_sample=false"
    resource_validation_exit=1
  fi

  timeout 3660s docker exec --interactive \
    --env "ISOLATED_TCG_PHASE=$phase" \
    --env "ISOLATED_TCG_DURATION_SECONDS=$DIAGNOSTIC_PHASE_SECONDS" \
    --env "ISOLATED_TCG_CONCURRENCY=$DIAGNOSTIC_CONCURRENCY" \
    --env "ISOLATED_TCG_TARGET=$DIAGNOSTIC_TARGET" \
    "$anchor" node --input-type=module - \
    <"$GITHUB_WORKSPACE/scripts/deployment/isolated-tcg-rsc-load.mjs" \
    >"$helper_stdout_file" 2>"$helper_stderr_file" || helper_exit=$?

  summary="$(cat "$helper_stdout_file")"
  report_helper_error "$phase" "$helper_stderr_file" "$helper_exit" true
  if kill -0 "$resource_sampler_pid" 2>/dev/null; then
    kill -TERM "$resource_sampler_pid" 2>/dev/null || true
  fi
  wait "$resource_sampler_pid" || resource_sampler_exit=$?
  if validated_resources="$(node scripts/deployment/validate-isolated-container-resource-series.mjs <"$resources_stdout_file" 2>/dev/null)"; then
    echo "${phase}_container_resources=$validated_resources"
  else
    resource_validation_exit=1
    echo "${phase}_container_resources_valid=false"
  fi
  resource_stats_status="$(sed -nE 's/^container_stats_samples=([0-9]+) container_stats_errors=([0-9]+)$/samples=\1 errors=\2/p' "$resources_stderr_file" | head -n 1)"
  if [[ "$resource_stats_status" =~ ^samples=[0-9]+\ errors=[0-9]+$ ]]; then
    echo "${phase}_container_resources_status=$resource_stats_status"
  else
    resource_validation_exit=1
    echo "${phase}_container_resources_status=unavailable"
  fi
  if (( resource_sampler_exit != 0 )); then
    resource_validation_exit=1
    echo "${phase}_container_resource_sampler_exit=$resource_sampler_exit"
  fi
  if report_container_state "$phase" "$app"; then
    app_state_exit=0
  else
    app_state_exit=$?
  fi
  report_node_logs "$phase" "$app"

  if [[ -n "$summary" ]]; then
    validated_summary="$(printf '%s\n' "$summary" | node scripts/deployment/validate-isolated-tcg-rsc-summary.mjs "$phase" 2>"$helper_stderr_file")" || validation_exit=$?
    if [[ -n "$validated_summary" ]]; then
      echo "${phase}_summary=$validated_summary"
    fi
    if (( validation_exit != 0 )); then
      report_helper_error "${phase}_validation" "$helper_stderr_file" "$validation_exit"
      echo "${phase}_summary_valid=false validation_exit=$validation_exit"
    fi
  else
    echo "${phase}_summary_missing=true helper_exit=$helper_exit"
  fi

  rm -f "$helper_stdout_file" "$helper_stderr_file" "$resources_stdout_file" "$resources_stderr_file"
  remove_phase "$phase"

  if (( helper_exit != 0 || validation_exit != 0 || app_state_exit != 0 || resource_validation_exit != 0 )); then
    return 1
  fi
  if [[ -z "$validated_summary" ]]; then
    return 1
  fi
}

result=0
run_phase full || result=1
if [[ "$DIAGNOSTIC_PHASES" == full,abort ]]; then
  run_phase abort || result=1
fi
exit "$result"
