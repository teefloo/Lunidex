#!/usr/bin/env bash
set -Eeuo pipefail

readonly expected_revision='d0f5e1af2cf95dd43eb046069c0d37f0a2add93e'
readonly marker="neon-public-only:$expected_revision"
readonly image_pattern='^ghcr\.io/teefloo/lunidex@sha256:[0-9a-f]{64}$'

image_ref="${1:-}"
runtime_env="${2:-}"
if [[ ! "$image_ref" =~ $image_pattern || -z "$runtime_env" || ! -f "$runtime_env" || -L "$runtime_env" ]]; then
  echo 'A digest-pinned image and its saved runtime environment are required.' >&2
  exit 78
fi

repo_digests="$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$image_ref")"
grep -Fxq -- "$image_ref" <<<"$repo_digests" || {
  echo 'The image reference does not match a locally verified repository digest.' >&2
  exit 78
}

revision="$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image_ref")"
backend="$(docker image inspect --format '{{ index .Config.Labels "com.lunidex.backend" }}' "$image_ref")"
if [[ "$revision" != "$expected_revision" || "$backend" == 'supabase' ]]; then
  echo 'The image is not the expected historical Neon revision.' >&2
  exit 78
fi

if ! awk -F= '$1 == "NEON_DATABASE_URL" && length($2) > 0 { found = 1 } END { exit !found }' "$runtime_env"; then
  echo 'The saved runtime environment does not contain a Neon database configuration.' >&2
  exit 78
fi

docker run --rm --network none --read-only --memory 128m --cpus 0.2 \
  --entrypoint node "$image_ref" --input-type=module -e \
  "import { existsSync } from 'node:fs'; if (!existsSync('/app/node_modules/@neondatabase/serverless/index.mjs')) process.exit(1)" \
  >/dev/null

printf '%s\n' "$marker"
