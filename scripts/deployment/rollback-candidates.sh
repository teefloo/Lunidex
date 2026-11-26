#!/usr/bin/env bash

# Print compatible Supabase images first. The historical d0f5 image is only a
# public-only emergency fallback after its OCI revision and Neon driver have
# been verified by the caller; it is never labelled as Supabase-compatible.
production_rollback_candidates() {
  local configured_ref="${1:-}" container_digest_ref="${2:-}" running="${3:-false}" health="${4:-}" fallback_ref="${5:-}" container_backend="${6:-}" legacy_marker="${7:-}"
  local digest_pattern='^ghcr\.io/teefloo/lunidex@sha256:[0-9a-f]{64}$'

  if [[ -n "$fallback_ref" && ! "$fallback_ref" =~ $digest_pattern ]]; then return 64; fi
  if [[ "$configured_ref" =~ $digest_pattern && "$container_digest_ref" == "$configured_ref" \
    && "$running" == 'true' && "$health" == 'healthy' && "$container_backend" == 'supabase' ]]; then
    printf '%s\n' "$configured_ref"
  elif [[ "$container_digest_ref" =~ $digest_pattern && "$running" == 'true' \
    && "$health" == 'healthy' && "$container_backend" == 'supabase' ]]; then
    printf '%s\n' "$container_digest_ref"
  fi

  if [[ "$running" == 'true' && "$health" == 'healthy' \
    && "$legacy_marker" == 'neon-public-only:d0f5e1af2cf95dd43eb046069c0d37f0a2add93e' \
    && "$container_backend" != 'supabase' && "$container_digest_ref" =~ $digest_pattern ]]; then
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
