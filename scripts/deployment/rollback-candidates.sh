#!/usr/bin/env bash

# Print only healthy Supabase images. Legacy Neon images are never candidates.
production_rollback_candidates() {
  local configured_ref="${1:-}" container_digest_ref="${2:-}" running="${3:-false}" health="${4:-}" fallback_ref="${5:-}" container_backend="${6:-}"
  local digest_pattern='^ghcr\.io/teefloo/lunidex@sha256:[0-9a-f]{64}$'

  if [[ -n "$fallback_ref" && ! "$fallback_ref" =~ $digest_pattern ]]; then return 64; fi
  if [[ "$configured_ref" =~ $digest_pattern && "$container_digest_ref" == "$configured_ref" \
    && "$running" == 'true' && "$health" == 'healthy' && "$container_backend" == 'supabase' ]]; then
    printf '%s\n' "$configured_ref"
  elif [[ "$container_digest_ref" =~ $digest_pattern && "$running" == 'true' \
    && "$health" == 'healthy' && "$container_backend" == 'supabase' ]]; then
    printf '%s\n' "$container_digest_ref"
  fi

  if [[ -n "$fallback_ref" && "$fallback_ref" != "$container_digest_ref" ]]; then
    printf '%s\n' "$fallback_ref"
  fi
}

production_last_stable_candidates() {
  local previous_ref="${1:-}" fallback_ref="${2:-}"
  local digest_pattern='^ghcr\.io/teefloo/lunidex@sha256:[0-9a-f]{64}$'
  if [[ -n "$fallback_ref" && ! "$fallback_ref" =~ $digest_pattern ]]; then return 64; fi
  if [[ "$previous_ref" =~ $digest_pattern && "$previous_ref" != "$fallback_ref" ]]; then
    printf '%s\n' "$previous_ref"
  fi
  [[ -z "$fallback_ref" ]] || printf '%s\n' "$fallback_ref"
}
