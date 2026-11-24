#!/usr/bin/env bash
set -Eeuo pipefail

image_ref="${1:-}"
expected_revision="${2:-}"
if [[ ! "$image_ref" =~ ^ghcr\.io/teefloo/lunidex@sha256:[0-9a-f]{64}$ ]]; then
  echo 'Image validation requires a digest-pinned GHCR reference.' >&2
  exit 64
fi
if [[ ! "$expected_revision" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Image validation requires the expected full source revision.' >&2
  exit 64
fi

temporary_root="$(mktemp -d "${RUNNER_TEMP:-/tmp}/lunidex-image-validation.XXXXXX")"
container_name="lunidex-image-validation-${GITHUB_RUN_ID:-local}-$$"
cleanup() {
  docker rm --force "$container_name" >/dev/null 2>&1 || true
  rm -rf "$temporary_root"
}
trap cleanup EXIT

docker pull --platform linux/amd64 "$image_ref"
image_json="$(docker image inspect "$image_ref")"
revision="$(printf '%s' "$image_json" | jq -r '.[0].Config.Labels["org.opencontainers.image.revision"] // ""')"
platform="$(printf '%s' "$image_json" | jq -r '.[0] | "\(.Os)/\(.Architecture)"')"
image_user="$(printf '%s' "$image_json" | jq -r '.[0].Config.User // ""')"
workdir="$(printf '%s' "$image_json" | jq -r '.[0].Config.WorkingDir // ""')"
command="$(printf '%s' "$image_json" | jq -c '.[0].Config.Cmd // []')"
if [[ "$revision" != "$expected_revision" || "$platform" != 'linux/amd64' || "$image_user" != 'nextjs' || "$workdir" != '/app' || "$command" != '["node","server.js"]' ]]; then
  echo 'Image revision, platform, or expected Compose runtime contract did not match.' >&2
  printf 'revision=%s platform=%s user=%s workdir=%s cmd=%s\n' "$revision" "$platform" "$image_user" "$workdir" "$command" >&2
  exit 78
fi

mkdir -p "$temporary_root/compose"
cp compose.production.yaml "$temporary_root/compose/compose.production.yaml"
: > "$temporary_root/compose/app.env"
printf 'APP_IMAGE_REF=%s\n' "$image_ref" > "$temporary_root/compose/.env"
docker compose \
  --project-directory "$temporary_root/compose" \
  --env-file "$temporary_root/compose/.env" \
  -f "$temporary_root/compose/compose.production.yaml" config --format json \
  > "$temporary_root/compose-rendered.json"
rendered_image="$(jq -r '.services.app.image' "$temporary_root/compose-rendered.json")"
rendered_limit="$(jq -r '.services.app.mem_limit' "$temporary_root/compose-rendered.json")"
rendered_cpus="$(jq -r '.services.app.cpus' "$temporary_root/compose-rendered.json")"
if [[ "$rendered_image" != "$image_ref" || "$rendered_limit" != '2176m' || "$rendered_cpus" != '1' ]]; then
  echo 'The current production Compose file did not render the immutable image and bounded resources as expected.' >&2
  exit 78
fi

docker run --detach --name "$container_name" \
  --network none \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --tmpfs /app/.next/cache:rw,noexec,nosuid,size=128m,uid=1001,gid=1001 \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --pids-limit 256 \
  --memory 2176m \
  --cpus 1.0 \
  --env NODE_ENV=production \
  --env HOSTNAME=0.0.0.0 \
  --env PORT=3000 \
  --env NODE_OPTIONS=--max-old-space-size=1408 \
  "$image_ref" >/dev/null

for attempt in $(seq 1 45); do
  if docker exec "$container_name" node --input-type=module -e \
    "const response = await fetch('http://127.0.0.1:3000/api/healthz', { signal: AbortSignal.timeout(3000) }); const payload = await response.json(); if (!response.ok || payload.status !== 'ok') process.exit(1);" \
    >/dev/null 2>&1; then
    printf 'Isolated image validation passed: revision=%s digest=%s platform=%s; app health passed without Neon secrets or egress.\n' \
      "$revision" "${image_ref##*@}" "$platform"
    exit 0
  fi
  running="$(docker inspect --format '{{.State.Running}}' "$container_name" 2>/dev/null || true)"
  if [[ "$running" != 'true' ]]; then
    docker logs "$container_name" >&2 || true
    echo 'Candidate container exited before the local health endpoint became ready.' >&2
    exit 1
  fi
  sleep 2
done

docker logs "$container_name" >&2 || true
echo 'Image health endpoint did not become ready in the isolated container.' >&2
exit 1
