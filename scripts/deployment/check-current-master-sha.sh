#!/usr/bin/env bash
set -Eeuo pipefail

expected_sha="${1:-}"
if [[ ! "$expected_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Expected master SHA must be a full 40-character commit.' >&2
  exit 64
fi
if [[ -z "${GITHUB_REPOSITORY:-}" || -z "${GH_TOKEN:-}" ]]; then
  echo 'GitHub repository and read token are required to check the current master SHA.' >&2
  exit 78
fi

current_sha="$(gh api "repos/$GITHUB_REPOSITORY/commits/master" --jq '.sha')"
if [[ ! "$current_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'GitHub returned an invalid master SHA.' >&2
  exit 78
fi
if [[ "$current_sha" != "$expected_sha" ]]; then
  echo "Skipping stale deployment for $expected_sha; current master is $current_sha." >&2
  exit 78
fi

printf 'master_sha_current=%s\n' "$current_sha"
