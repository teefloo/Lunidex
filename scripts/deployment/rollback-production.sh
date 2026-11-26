#!/usr/bin/env bash
set -Eeuo pipefail

readonly image_pattern='^ghcr\.io/teefloo/lunidex@sha256:[0-9a-f]{64}$'
rollback_mode='manual'
case "${1:-}" in
  '') ;;
  --last-stable) rollback_mode='last-stable' ;;
  --neon-public-only) rollback_mode='neon-public-only' ;;
  *)
    echo 'Usage: rollback-production.sh [--last-stable|--neon-public-only]' >&2
    exit 64
    ;;
esac

cd /opt/lunidex-production
if [[ ! -f .env || ! -f app.env || -L app.env ]]; then
  echo 'Production environment files are missing.' >&2
  exit 78
fi
bash /opt/lunidex-production/scripts/deployment/require-supabase-ca.sh

configured_ref="$(sed -n 's/^SUPABASE_ROLLBACK_IMAGE_REF=//p' .env | tail -n 1)"
if [[ -n "$configured_ref" && ! "$configured_ref" =~ $image_pattern ]]; then
  echo 'Configured Supabase rollback image is not digest-pinned.' >&2
  exit 78
fi
previous_ref="$(cat .previous-image-ref 2>/dev/null || true)"
previous_kind="$(cat .previous-image-backend 2>/dev/null || true)"
if [[ -n "$previous_ref" && ! "$previous_ref" =~ $image_pattern ]]; then
  echo 'The saved last-stable image reference is not digest-pinned.' >&2
  exit 78
fi

declare -a candidate_refs=() candidate_kinds=() candidate_envs=()
append_candidate() {
  local image_ref="$1" kind="$2" env_file="$3"
  candidate_refs+=("$image_ref")
  candidate_kinds+=("$kind")
  candidate_envs+=("$env_file")
}

verify_supabase_image() {
  local image_ref="$1" backend
  [[ "$image_ref" =~ $image_pattern ]] || return 1
  docker pull "$image_ref" >/dev/null
  backend="$(docker image inspect --format '{{ index .Config.Labels "com.lunidex.backend" }}' "$image_ref")"
  [[ "$backend" == 'supabase' ]]
}

case "$rollback_mode" in
  manual)
    if [[ -z "$configured_ref" ]] || ! verify_supabase_image "$configured_ref"; then
      echo 'No verified Supabase-compatible rollback digest is configured.' >&2
      exit 78
    fi
    append_candidate "$configured_ref" supabase app.env
    ;;
  last-stable|neon-public-only)
    if [[ ! "$previous_ref" =~ $image_pattern || ! -f .previous-app.env || -L .previous-app.env ]]; then
      echo 'The saved last-stable image and matching app.env are required.' >&2
      exit 78
    fi
    chmod 0600 .previous-app.env
    if [[ "$previous_kind" == 'neon-public-only:d0f5e1af2cf95dd43eb046069c0d37f0a2add93e' ]]; then
      docker pull "$previous_ref" >/dev/null
      verified_marker="$(bash /opt/lunidex-production/scripts/deployment/verify-neon-public-only-image.sh \
        "$previous_ref" .previous-app.env)"
      [[ "$verified_marker" == "$previous_kind" ]] || {
        echo 'The saved public-only Neon fallback could not be independently verified.' >&2
        exit 78
      }
      append_candidate "$previous_ref" neon-public-only .previous-app.env
    elif [[ "$previous_kind" == 'supabase' ]]; then
      verify_supabase_image "$previous_ref" || {
        echo 'The saved last-stable image is not verified as Supabase-compatible.' >&2
        exit 78
      }
      append_candidate "$previous_ref" supabase .previous-app.env
    else
      echo 'The saved last-stable image has no recognized backend marker.' >&2
      exit 78
    fi

    if [[ "$rollback_mode" == 'neon-public-only' ]]; then
      [[ "${candidate_kinds[0]}" == 'neon-public-only' ]] || {
        echo 'No explicitly verified Neon public-only fallback is recorded.' >&2
        exit 78
      }
    elif [[ -n "$configured_ref" && "$configured_ref" != "$previous_ref" ]]; then
      verify_supabase_image "$configured_ref" || {
        echo 'Configured Supabase rollback image is not verified as compatible.' >&2
        exit 78
      }
      append_candidate "$configured_ref" supabase app.env
    fi
    ;;
esac

exec 9>.deploy.lock
if ! flock -n 9; then
  echo 'Another production deployment is already running.' >&2
  exit 75
fi

write_image_ref() {
  local image_ref="$1" tmp
  tmp="$(mktemp .env.XXXXXX)"
  awk -v image_ref="$image_ref" '
    BEGIN { updated = 0 }
    /^APP_IMAGE_TAG=/ { next }
    /^APP_IMAGE_REF=/ { print "APP_IMAGE_REF=" image_ref; updated = 1; next }
    { print }
    END { if (!updated) print "APP_IMAGE_REF=" image_ref }
  ' .env > "$tmp"
  chmod 0600 "$tmp"
  mv "$tmp" .env
}

install_app_env() {
  local source_file="$1" tmp
  tmp="$(mktemp app.env.XXXXXX)"
  cp -- "$source_file" "$tmp"
  chmod 0600 "$tmp"
  mv -f -- "$tmp" app.env
}

wait_for_app() {
  local attempt status
  for attempt in $(seq 1 45); do
    status="$(docker inspect --format '{{.State.Health.Status}}' lunidex-production-app 2>/dev/null || true)"
    [[ "$status" == 'healthy' ]] && return 0
    [[ "$status" == 'unhealthy' ]] && return 1
    sleep 2
  done
  return 1
}

current_env_backup="$(mktemp .rollback-current-app.env.XXXXXX)"
current_dotenv_backup="$(mktemp .rollback-current-dotenv.XXXXXX)"
cp -- app.env "$current_env_backup"
cp -- .env "$current_dotenv_backup"
chmod 0600 "$current_env_backup" "$current_dotenv_backup"

for index in "${!candidate_refs[@]}"; do
  candidate="${candidate_refs[$index]}"
  kind="${candidate_kinds[$index]}"
  env_file="${candidate_envs[$index]}"
  [[ "$candidate" =~ $image_pattern ]] || {
    echo 'Refusing a rollback reference that is not digest-pinned.' >&2
    exit 64
  }

  if [[ "$kind" == 'neon-public-only' ]]; then
    echo 'Emergency rollback uses historical Neon d0f5 as public-only fallback; Neon Auth and cloud data remain unavailable.' >&2
  else
    echo "Trying Supabase-compatible immutable rollback image $candidate."
  fi
  install_app_env "$env_file"
  write_image_ref "$candidate"
  if docker compose -f compose.production.yaml config --quiet \
    && docker compose -f compose.production.yaml pull app \
    && docker compose -f compose.production.yaml up -d --no-deps app \
    && wait_for_app \
    && bash /opt/lunidex-production/scripts/deployment/healthcheck-production.sh; then
    printf '%s\n' "$candidate" > .previous-image-ref
    chmod 0600 .previous-image-ref
    printf '%s\n' "$kind" > .previous-image-backend
    chmod 0600 .previous-image-backend
    if [[ "$env_file" != '.previous-app.env' ]]; then
      cp -- "$env_file" .previous-app.env.tmp
      chmod 0600 .previous-app.env.tmp
      mv -f -- .previous-app.env.tmp .previous-app.env
    fi
    rm -f -- "$current_env_backup" "$current_dotenv_backup"
    echo "Rollback image $candidate is healthy. Backend class: $kind."
    exit 0
  fi
  echo "Rollback candidate $candidate failed health validation." >&2
done

install_app_env "$current_env_backup"
cp -- "$current_dotenv_backup" .env.tmp
chmod 0600 .env.tmp
mv -f -- .env.tmp .env
rm -f -- "$current_env_backup" "$current_dotenv_backup"
echo 'All rollback candidates failed; restored the current app.env and image reference. Inspect Docker and app logs immediately.' >&2
exit 1
