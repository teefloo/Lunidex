#!/usr/bin/env bash

# Print a healthy, digest-pinned currently running image first, then the d0f5
# emergency baseline. Only immutable references from the Lunidex GHCR package
# are eligible.
production_rollback_candidates() {
  local configured_ref="${1:-}" container_ref="${2:-}" running="${3:-false}" health="${4:-}" fallback_ref="${5:-}"
  local digest_pattern='^ghcr\.io/teefloo/lunidex@sha256:[0-9a-f]{64}$'

  [[ "$fallback_ref" =~ $digest_pattern ]] || return 64
  if [[ "$configured_ref" =~ $digest_pattern && "$container_ref" == "$configured_ref" && "$running" == 'true' && "$health" == 'healthy' ]]; then
    printf '%s\n' "$configured_ref"
  fi
  if [[ "$configured_ref" != "$fallback_ref" || "$container_ref" != "$fallback_ref" || "$running" != 'true' || "$health" != 'healthy' ]]; then
    printf '%s\n' "$fallback_ref"
  fi
}

production_last_stable_candidates() {
  local previous_ref="${1:-}" fallback_ref="${2:-}"
  local digest_pattern='^ghcr\.io/teefloo/lunidex@sha256:[0-9a-f]{64}$'
  [[ "$fallback_ref" =~ $digest_pattern ]] || return 64
  if [[ "$previous_ref" =~ $digest_pattern && "$previous_ref" != "$fallback_ref" ]]; then
    printf '%s\n' "$previous_ref"
  fi
  printf '%s\n' "$fallback_ref"
}
