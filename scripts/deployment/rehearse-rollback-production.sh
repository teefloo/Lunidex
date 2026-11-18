#!/usr/bin/env bash
set -Eeuo pipefail

baseline_sha=ace4b8eb76e5992c935cfc01120377d17297733d
requested_baseline="${1:-}"
candidate_sha="${2:-}"
if [[ "$requested_baseline" != "$baseline_sha" ]]; then
  echo "Rollback rehearsal is limited to the pinned initial baseline image." >&2
  exit 64
fi
if [[ ! "$candidate_sha" =~ ^[0-9a-f]{40}$ || "$candidate_sha" == "$baseline_sha" ]]; then
  echo "Rollback rehearsal requires a candidate SHA distinct from the pinned baseline." >&2
  exit 64
fi

cd /opt/lunidex-production
if [[ ! -f .env || ! -f app.env ]]; then
  echo "Production environment files are missing." >&2
  exit 78
fi
docker info >/dev/null
tag_line_count="$(grep -c '^APP_IMAGE_TAG=' .env || true)"
if [[ "$tag_line_count" != "1" ]]; then
  echo "Expected exactly one APP_IMAGE_TAG in the production .env file." >&2
  exit 78
fi
pre_test_tag="$(sed -n 's/^APP_IMAGE_TAG=//p' .env | tail -n 1)"
if [[ ! "$pre_test_tag" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Production APP_IMAGE_TAG must be a full Git SHA before rollback rehearsal." >&2
  exit 78
fi
container_running="$(docker inspect --format '{{.State.Running}}' lunidex-production-app 2>/dev/null || true)"
if [[ "$container_running" == "true" ]]; then
  echo "Rollback rehearsal refuses to replace an already running production app." >&2
  exit 78
fi

write_image_tag() {
  local tag="$1" tmp
  tmp="$(mktemp .env.XXXXXX)"
  if ! awk -v tag="$tag" '
    BEGIN { updated = 0 }
    /^APP_IMAGE_TAG=/ { print "APP_IMAGE_TAG=" tag; updated = 1; next }
    { print }
    END { if (!updated) print "APP_IMAGE_TAG=" tag }
  ' .env > "$tmp"; then
    rm -f "$tmp"
    return 1
  fi
  if ! chmod 0600 "$tmp" || ! mv -f "$tmp" .env; then
    rm -f "$tmp"
    return 1
  fi
}

wait_for_app() {
  local attempt status
  for attempt in $(seq 1 45); do
    status="$(docker inspect --format '{{.State.Health.Status}}' lunidex-production-app 2>/dev/null || true)"
    if [[ "$status" == "healthy" ]]; then return 0; fi
    if [[ "$status" == "unhealthy" ]]; then return 1; fi
    sleep 2
  done
  return 1
}

cleanup() {
  local result=$?
  local cleanup_failed=0
  trap - EXIT

  if ! docker compose -f compose.production.yaml stop app >/dev/null 2>&1; then
    echo "Could not stop the production app after rollback rehearsal." >&2
    cleanup_failed=1
  fi
  if ! write_image_tag "$pre_test_tag"; then
    echo "Could not restore APP_IMAGE_TAG after rollback rehearsal." >&2
    cleanup_failed=1
  fi
  if ((cleanup_failed)) && ((result == 0)); then
    result=1
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

write_image_tag "$candidate_sha"
docker compose -f compose.production.yaml config --quiet
docker compose -f compose.production.yaml pull app
docker compose -f compose.production.yaml up -d --no-deps app
wait_for_app
bash /opt/lunidex-production/scripts/deployment/healthcheck-production.sh

bash /opt/lunidex-production/scripts/deployment/rollback-production.sh "$baseline_sha"
bash /opt/lunidex-production/scripts/deployment/healthcheck-production.sh

echo "Candidate $candidate_sha transitioned to baseline $baseline_sha; both passed container, Neon Auth JWKS, and read-only SELECT 1 checks."
echo "The exit cleanup will stop the app and restore its pre-rehearsal APP_IMAGE_TAG."
