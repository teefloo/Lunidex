#!/usr/bin/env bash

# The pinned rollback is the last known Supabase-compatible production image.
# Keep this independent of runtime/GitHub environment variables so legacy
# Neon-era digests can never be selected as a fallback.
readonly PRODUCTION_SUPABASE_ROLLBACK_IMAGE_REF='ghcr.io/teefloo/lunidex@sha256:bbbfeaef9efd4a150ff0d68bd6762c4f54a3cd14e804527a1619778523aef7ac'
readonly PRODUCTION_SUPABASE_ROLLBACK_REVISION='5703ceba7585e4ee4243ba03add60d53ba33f335'

production_validate_supabase_rollback_image() {
  local image_ref="${1:-}" revision="${2:-}" backend="${3:-}"
  if [[ "$image_ref" != "$PRODUCTION_SUPABASE_ROLLBACK_IMAGE_REF" ]]; then
    echo 'The production rollback image must match the approved immutable Supabase digest.' >&2
    return 78
  fi
  if [[ "$revision" != "$PRODUCTION_SUPABASE_ROLLBACK_REVISION" || "$backend" != 'supabase' ]]; then
    echo 'The pinned rollback image source or backend label does not match the approved Supabase image.' >&2
    return 78
  fi
  return 0
}
