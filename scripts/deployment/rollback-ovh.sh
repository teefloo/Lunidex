#!/usr/bin/env bash
set -Eeuo pipefail

cd /opt/lunidex
tag="${1:-$(cat .previous-image-tag 2>/dev/null || true)}"
if [[ ! "$tag" =~ ^[0-9a-f]{40}$ ]]; then
  echo "No valid previous image SHA is recorded." >&2
  exit 78
fi

exec bash /opt/lunidex/scripts/deployment/deploy-ovh.sh "$tag"
